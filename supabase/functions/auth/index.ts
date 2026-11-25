/**
 * Community Data — authentication backend (Supabase Edge Function).
 *
 * Why this exists: Supabase Auth signs in with an email address, but this
 * project must never collect real emails and must support username + password.
 * The username → internal identity mapping therefore lives here, server-side,
 * together with the shared invitation code check and the recovery-code flow.
 *
 * Secret keys stay in the function environment; nothing here is shipped to the
 * browser.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY =
  Deno.env.get('SUPABASE_ANON_KEY') ??
  Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
  'sb_publishable_OQUqE17y_8O6NnkQX3rfqA_h4n5YIe2'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MAX_FAILED_ATTEMPTS = 25
const ATTEMPT_WINDOW_MINUTES = 15

interface Payload {
  action?: string
  invitation_code?: string
  username?: string
  display_name?: string
  password?: string
  new_password?: string
  recovery_code?: string
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function fail(error: string, status = 400, extra: Record<string, unknown> = {}): Response {
  return json({ error, ...extra }, status)
}

function randomCode(groups = 4, size = 4): string {
  const out: string[] = []
  for (let g = 0; g < groups; g += 1) {
    let chunk = ''
    const bytes = new Uint8Array(size)
    crypto.getRandomValues(bytes)
    for (const byte of bytes) {
      chunk += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length]
    }
    out.push(chunk)
  }
  return out.join('-')
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function normalizeUsername(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function normalizeCode(value: unknown): string {
  return String(value ?? '').trim().toUpperCase()
}

async function countProfiles(): Promise<number> {
  const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true })
  return count ?? 0
}

async function findProfile(username: string) {
  const { data } = await admin
    .from('profiles')
    .select('id, username, display_name, account_status')
    .ilike('username', username)
    .maybeSingle()
  return data
}

async function isRateLimited(): Promise<boolean> {
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60_000).toISOString()
  const { count } = await admin
    .from('registration_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('succeeded', false)
    .gte('created_at', since)
  return (count ?? 0) >= MAX_FAILED_ATTEMPTS
}

async function logAttempt(succeeded: boolean, reason: string | null): Promise<void> {
  await admin.from('registration_attempts').insert({ succeeded, reason })
}

async function issueRecoveryCode(userId: string): Promise<string> {
  const code = randomCode()
  const salt = randomCode(2, 8)
  const hash = await sha256Hex(`${salt}:${code}`)

  await admin
    .from('account_recovery_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('used_at', null)

  await admin.from('account_recovery_codes').insert({
    user_id: userId,
    code_hash: hash,
    code_salt: salt,
  })

  return code
}

function validateIdentity(body: Payload): string | null {
  const username = normalizeUsername(body.username)
  const displayName = String(body.display_name ?? '').trim()
  const password = String(body.password ?? '')

  if (!USERNAME_PATTERN.test(username)) return 'invalid_username'
  if (displayName.length < 1 || displayName.length > 40) return 'invalid_display_name'
  if (password.length < 8) return 'invalid_password'
  return null
}

async function createAccount(
  username: string,
  displayName: string,
  password: string,
  isFounder: boolean,
) {
  // Internal identifier: a random UUID, never a real address, never predictable.
  const email = `${crypto.randomUUID()}@users.invalid`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, display_name: displayName },
  })

  if (error || !data.user) {
    return { recoveryCode: null, error: error?.message ?? 'create_failed' }
  }

  if (isFounder) {
    await admin.from('user_roles').delete().eq('user_id', data.user.id).eq('role', 'member')
    await admin
      .from('user_roles')
      .upsert({ user_id: data.user.id, role: 'admin' }, { onConflict: 'user_id,role' })
  }

  const recoveryCode = await issueRecoveryCode(data.user.id)
  return { recoveryCode, error: null }
}

async function handleRegister(body: Payload): Promise<Response> {
  const identityError = validateIdentity(body)
  if (identityError) return fail(identityError)

  const username = normalizeUsername(body.username)
  const displayName = String(body.display_name ?? '').trim()
  const password = String(body.password ?? '')

  const { data: settings, error: settingsError } = await admin
    .from('site_settings')
    .select('registration_enabled, invitation_code_hash')
    .eq('id', 1)
    .single()

  if (settingsError) return fail('settings_unavailable', 500)
  if (!settings.registration_enabled) return fail('registration_disabled', 403)
  if (!settings.invitation_code_hash) return fail('registration_not_configured', 403)

  if (await isRateLimited()) {
    await logAttempt(false, 'rate_limited')
    return fail('rate_limited', 429)
  }

  const provided = `sha256:${await sha256Hex(String(body.invitation_code ?? '').trim())}`
  if (provided !== settings.invitation_code_hash) {
    await logAttempt(false, 'invalid_invitation_code')
    return fail('invalid_invitation_code', 403)
  }

  if (await findProfile(username)) {
    await logAttempt(false, 'username_taken')
    return fail('username_taken', 409)
  }

  const result = await createAccount(username, displayName, password, false)
  if (!result.recoveryCode) {
    await logAttempt(false, result.error)
    return fail('registration_failed', 400, { detail: result.error })
  }

  await logAttempt(true, null)
  return json({ username, display_name: displayName, recovery_code: result.recoveryCode })
}

async function handleBootstrap(body: Payload): Promise<Response> {
  if ((await countProfiles()) > 0) return fail('bootstrap_closed', 403)

  const identityError = validateIdentity(body)
  if (identityError) return fail(identityError)

  const username = normalizeUsername(body.username)
  const displayName = String(body.display_name ?? '').trim()
  const password = String(body.password ?? '')

  const result = await createAccount(username, displayName, password, true)
  if (!result.recoveryCode) return fail('registration_failed', 400, { detail: result.error })

  return json({ username, display_name: displayName, recovery_code: result.recoveryCode })
}

async function handleLogin(body: Payload): Promise<Response> {
  const username = normalizeUsername(body.username)
  const password = String(body.password ?? '')
  if (!username || !password) return fail('invalid_credentials', 401)

  const profile = await findProfile(username)
  if (!profile) return fail('invalid_credentials', 401)
  if (profile.account_status !== 'active') return fail('account_suspended', 403)

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(profile.id)
  const email = userData?.user?.email
  if (userError || !email) return fail('invalid_credentials', 401)

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) return fail('invalid_credentials', 401)

  return json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
}

async function handleRecover(body: Payload): Promise<Response> {
  const username = normalizeUsername(body.username)
  const code = normalizeCode(body.recovery_code)
  const newPassword = String(body.new_password ?? '')

  if (newPassword.length < 8) return fail('invalid_password')
  if (!username || !code) return fail('invalid_recovery')

  const profile = await findProfile(username)
  if (!profile) return fail('invalid_recovery')

  const { data: stored } = await admin
    .from('account_recovery_codes')
    .select('id, code_hash, code_salt')
    .eq('user_id', profile.id)
    .is('used_at', null)
    .maybeSingle()

  if (!stored) return fail('invalid_recovery')

  const hash = await sha256Hex(`${stored.code_salt}:${code}`)
  if (hash !== stored.code_hash) return fail('invalid_recovery')

  const { error } = await admin.auth.admin.updateUserById(profile.id, { password: newPassword })
  if (error) return fail('password_update_failed', 400)

  await admin
    .from('account_recovery_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', stored.id)

  // A used code is dead; issue a fresh one so the account stays recoverable.
  const recoveryCode = await issueRecoveryCode(profile.id)

  return json({ username: profile.username, recovery_code: recoveryCode })
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (request.method === 'GET') {
    return json({ ok: true, actions: ['register', 'login', 'recover', 'bootstrap'] })
  }

  let body: Payload
  try {
    body = (await request.json()) as Payload
  } catch {
    return fail('bad_request')
  }

  try {
    switch (body.action) {
      case 'register':
        return await handleRegister(body)
      case 'login':
        return await handleLogin(body)
      case 'recover':
        return await handleRecover(body)
      case 'bootstrap':
        return await handleBootstrap(body)
      default:
        return fail('unknown_action')
    }
  } catch (error) {
    console.error('auth function error', error)
    return fail('internal_error', 500)
  }
})
