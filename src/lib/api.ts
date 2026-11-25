import { supabase } from '@/lib/supabase/client'
import type {
  Achievement,
  AccountStatus,
  CommunityInfoEntry,
  CommunityUpdate,
  ExploreSection,
  Profile,
  Role,
} from '@/types'

export class ApiError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.name = 'ApiError'
    this.code = code
  }
}

/** Human-readable text for backend error codes (backend stays the authority). */
const MESSAGES: Record<string, string> = {
  registration_disabled: 'Registration is currently closed.',
  registration_not_configured: 'Registration is not configured yet.',
  invalid_invitation_code: 'That invitation code is not valid.',
  username_taken: 'This username is already taken.',
  invalid_username: 'Username must be 3-20 characters: a-z, 0-9 and underscore.',
  invalid_display_name: 'Display name must be 1-40 characters.',
  invalid_password: 'Password must be at least 8 characters.',
  rate_limited: 'Too many attempts. Try again later.',
  invalid_credentials: 'Wrong username or password.',
  account_suspended: 'This account is suspended.',
  invalid_recovery: 'Invalid username or recovery code.',
  password_update_failed: 'Password could not be updated.',
  bootstrap_closed: 'The founder account already exists.',
  not_authorized: 'You are not allowed to perform this action.',
  cannot_change_own_role: 'You cannot change your own role.',
  cannot_suspend_yourself: 'You cannot suspend your own account.',
  user_not_found: 'User not found.',
  achievement_not_found: 'Achievement not found.',
  section_not_found: 'Section not found.',
  update_not_found: 'Update not found.',
  invitation_code_too_short: 'The invitation code must be at least 6 characters.',
  request_failed: 'Something went wrong. Please try again.',
  internal_error: 'Server error. Please try again.',
}

export function describeError(error: unknown): string {
  if (error instanceof ApiError) return MESSAGES[error.code] ?? MESSAGES.request_failed
  if (error instanceof Error) return error.message
  return MESSAGES.request_failed
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {})
  if (error) throw new ApiError(error.message)
  return data as T
}

// ---------------------------------------------------------------------------
// Authentication (Edge Function `auth` keeps the secrets server-side)
// ---------------------------------------------------------------------------
interface AuthEnvelope {
  access_token?: string
  refresh_token?: string
  recovery_code?: string
  username?: string
  display_name?: string
  error?: string
}

async function callAuth(payload: Record<string, unknown>): Promise<AuthEnvelope> {
  const { data, error } = await supabase.functions.invoke('auth', { body: payload })

  if (error) {
    let code = 'request_failed'
    const response = (error as { context?: { json?: () => Promise<unknown> } }).context
    if (response?.json) {
      try {
        const body = (await response.json()) as { error?: string }
        if (body?.error) code = body.error
      } catch {
        /* ignore malformed error bodies */
      }
    }
    throw new ApiError(code)
  }

  const envelope = (data ?? {}) as AuthEnvelope
  if (envelope.error) throw new ApiError(envelope.error)
  return envelope
}

export const authApi = {
  bootstrapAvailable: () => rpc<boolean>('bootstrap_available'),

  async register(input: {
    invitationCode: string
    username: string
    displayName: string
    password: string
  }) {
    return callAuth({
      action: 'register',
      invitation_code: input.invitationCode,
      username: input.username,
      display_name: input.displayName,
      password: input.password,
    })
  },

  async bootstrap(input: { username: string; displayName: string; password: string }) {
    return callAuth({
      action: 'bootstrap',
      username: input.username,
      display_name: input.displayName,
      password: input.password,
    })
  },

  async login(username: string, password: string) {
    const result = await callAuth({ action: 'login', username, password })
    if (!result.access_token || !result.refresh_token) throw new ApiError('invalid_credentials')

    const { error } = await supabase.auth.setSession({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    })
    if (error) throw new ApiError('invalid_credentials')
  },

  async recover(input: { username: string; recoveryCode: string; newPassword: string }) {
    return callAuth({
      action: 'recover',
      username: input.username,
      recovery_code: input.recoveryCode,
      new_password: input.newPassword,
    })
  },

  signOut: () => supabase.auth.signOut(),
}

// ---------------------------------------------------------------------------
// Public data (RLS decides what a visitor is allowed to see)
// ---------------------------------------------------------------------------
export interface MemberRow {
  id: string
  username: string
  display_name: string
  avatar_path: string | null
  created_at: string
}

// `bio` is intentionally not selected: the directory does not render it.
const MEMBER_COLUMNS = 'id, username, display_name, avatar_path, created_at'

/** PostgREST `or()` filters use `,` and `%` as syntax - strip them from input. */
function sanitizeSearch(value: string): string {
  return value
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface AwardRow {
  achievement_id: string
  awarded_at: string
  achievements: {
    slug: string
    name: string
    description: string
    icon_path: string | null
  } | null
}

export const profilesApi = {
  async list(page: number, pageSize: number, search: string) {
    const from = (page - 1) * pageSize
    let query = supabase
      .from('profiles')
      .select(MEMBER_COLUMNS, { count: 'exact' })
      .eq('account_status', 'active')

    const term = sanitizeSearch(search)
    if (term) {
      query = query.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) throw new ApiError(error.message)
    return { rows: (data ?? []) as MemberRow[], total: count ?? 0 }
  },

  async recent(limit: number) {
    const { data, error } = await supabase
      .from('profiles')
      .select(MEMBER_COLUMNS)
      .eq('account_status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new ApiError(error.message)
    return (data ?? []) as MemberRow[]
  },

  async getByUsername(username: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', username)
      .maybeSingle()

    if (error) throw new ApiError(error.message)
    return (data as Profile | null) ?? null
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new ApiError(error.message)
    return (data as Profile | null) ?? null
  },

  async getRoles(userId: string) {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)

    if (error) throw new ApiError(error.message)
    return ((data ?? []) as { role: Role }[]).map((row) => row.role)
  },

  async getAwards(userId: string) {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('achievement_id, awarded_at, achievements ( slug, name, description, icon_path )')
      .eq('user_id', userId)
      .order('awarded_at', { ascending: false })

    if (error) throw new ApiError(error.message)
    return (data ?? []) as unknown as AwardRow[]
  },

  async updateOwn(userId: string, patch: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select('*')
      .single()

    if (error) throw new ApiError(error.message)
    return data as Profile
  },
}

// ---------------------------------------------------------------------------
// Site content
// ---------------------------------------------------------------------------
export const contentApi = {
  async settings() {
    const { data, error } = await supabase
      .from('site_settings')
      .select('registration_enabled, discord_invite_url')
      .eq('id', 1)
      .single()

    if (error) throw new ApiError(error.message)
    return data as { registration_enabled: boolean; discord_invite_url: string | null }
  },

  async stats() {
    const [members, achievements, updates] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('account_status', 'active'),
      supabase.from('achievements').select('id', { count: 'exact', head: true }),
      supabase
        .from('updates')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
    ])

    return {
      members: members.count ?? 0,
      achievements: achievements.count ?? 0,
      updates: updates.count ?? 0,
    }
  },

  async publishedUpdates(limit = 20) {
    const { data, error } = await supabase
      .from('updates')
      .select('id, title, slug, description, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) throw new ApiError(error.message)
    return (data ?? []) as Pick<
      CommunityUpdate,
      'id' | 'title' | 'slug' | 'description' | 'published_at'
    >[]
  },

  async updateBySlug(slug: string) {
    const { data, error } = await supabase
      .from('updates')
      .select('id, title, slug, description, content, published_at')
      .eq('status', 'published')
      .eq('slug', slug)
      .maybeSingle()

    if (error) throw new ApiError(error.message)
    return (
      (data as Pick<
        CommunityUpdate,
        'id' | 'title' | 'slug' | 'description' | 'content' | 'published_at'
      > | null) ?? null
    )
  },

  async communityInfo() {
    const { data, error } = await supabase
      .from('community_info')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw new ApiError(error.message)
    return (data ?? []) as CommunityInfoEntry[]
  },

  async exploreSections() {
    const { data, error } = await supabase
      .from('explore_sections')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })

    if (error) throw new ApiError(error.message)
    return (data ?? []) as ExploreSection[]
  },

  async exploreSectionBySlug(slug: string) {
    const { data, error } = await supabase
      .from('explore_sections')
      .select('*')
      .eq('is_published', true)
      .eq('slug', slug)
      .maybeSingle()

    if (error) throw new ApiError(error.message)
    return (data as ExploreSection | null) ?? null
  },

  async achievements() {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw new ApiError(error.message)
    return (data ?? []) as Achievement[]
  },
}

// ---------------------------------------------------------------------------
// Administration - every call lands in a SECURITY DEFINER function that checks
// the admin role on the server (README §8).
// ---------------------------------------------------------------------------
export interface AdminUserRow {
  id: string
  username: string
  display_name: string
  account_status: AccountStatus
  created_at: string
  user_roles: { role: Role }[]
}

export interface AdminStats {
  total_users: number
  active_users: number
  suspended_users: number
  achievements: number
  awards: number
  published_updates: number
  draft_updates: number
  explore_sections: number
  registration_enabled: boolean
}

export const adminApi = {
  stats: () => rpc<AdminStats>('admin_dashboard_stats'),

  async users(search: string, limit = 50) {
    let query = supabase
      .from('profiles')
      .select('id, username, display_name, account_status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    const term = sanitizeSearch(search)
    if (term) {
      query = query.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
    }

    const { data, error } = await query
    if (error) throw new ApiError(error.message)

    const profiles = (data ?? []) as Omit<AdminUserRow, 'user_roles'>[]
    if (profiles.length === 0) return []

    // profiles and user_roles both point at auth.users, so PostgREST cannot
    // embed one in the other. Two queries, merged here.
    const { data: roleRows, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in(
        'user_id',
        profiles.map((row) => row.id),
      )

    if (rolesError) throw new ApiError(rolesError.message)

    const rolesByUser = new Map<string, { role: Role }[]>()
    for (const row of (roleRows ?? []) as { user_id: string; role: Role }[]) {
      rolesByUser.set(row.user_id, [...(rolesByUser.get(row.user_id) ?? []), { role: row.role }])
    }

    return profiles.map((row) => ({ ...row, user_roles: rolesByUser.get(row.id) ?? [] }))
  },

  setRole: (userId: string, role: Role) =>
    rpc<void>('admin_set_role', { p_user_id: userId, p_role: role }),

  setStatus: (userId: string, status: AccountStatus) =>
    rpc<void>('admin_set_account_status', { p_user_id: userId, p_status: status }),

  setRegistration: (enabled: boolean, invitationCode: string | null) =>
    rpc<void>('admin_set_registration', {
      p_enabled: enabled,
      p_invitation_code: invitationCode,
    }),

  setDiscordUrl: (url: string) => rpc<void>('admin_set_discord_url', { p_url: url }),

  saveAchievement: (input: {
    id?: string | null
    slug: string
    name: string
    description: string
    iconPath?: string | null
  }) =>
    rpc<string>('admin_save_achievement', {
      p_id: input.id ?? null,
      p_slug: input.slug,
      p_name: input.name,
      p_description: input.description,
      p_icon_path: input.iconPath ?? null,
    }),

  deleteAchievement: (id: string) => rpc<void>('admin_delete_achievement', { p_id: id }),

  assignAchievement: (userId: string, achievementId: string) =>
    rpc<void>('admin_assign_achievement', {
      p_user_id: userId,
      p_achievement_id: achievementId,
    }),

  revokeAchievement: (userId: string, achievementId: string) =>
    rpc<void>('admin_revoke_achievement', {
      p_user_id: userId,
      p_achievement_id: achievementId,
    }),

  async allUpdates() {
    const { data, error } = await supabase
      .from('updates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new ApiError(error.message)
    return (data ?? []) as CommunityUpdate[]
  },

  saveUpdate: (input: {
    id?: string | null
    title: string
    slug: string
    description: string
    content: string
    publish: boolean
  }) =>
    rpc<string>('admin_save_update', {
      p_id: input.id ?? null,
      p_title: input.title,
      p_slug: input.slug,
      p_description: input.description,
      p_content: input.content,
      p_publish: input.publish,
    }),

  deleteUpdate: (id: string) => rpc<void>('admin_delete_update', { p_id: id }),

  async allCommunityInfo() {
    const { data, error } = await supabase
      .from('community_info')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw new ApiError(error.message)
    return (data ?? []) as CommunityInfoEntry[]
  },

  saveCommunityInfo: (input: {
    key: string
    title: string
    content: string
    sortOrder: number
  }) =>
    rpc<void>('admin_save_community_info', {
      p_key: input.key,
      p_title: input.title,
      p_content: input.content,
      p_sort_order: input.sortOrder,
    }),

  deleteCommunityInfo: (key: string) =>
    rpc<void>('admin_delete_community_info', { p_key: key }),

  async allExploreSections() {
    const { data, error } = await supabase
      .from('explore_sections')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw new ApiError(error.message)
    return (data ?? []) as ExploreSection[]
  },

  saveExploreSection: (input: {
    id?: string | null
    slug: string
    title: string
    description: string
    content: string | null
    sortOrder: number
    published: boolean
  }) =>
    rpc<string>('admin_save_explore_section', {
      p_id: input.id ?? null,
      p_slug: input.slug,
      p_title: input.title,
      p_description: input.description,
      p_content: input.content,
      p_sort_order: input.sortOrder,
      p_is_published: input.published,
    }),

  deleteExploreSection: (id: string) =>
    rpc<void>('admin_delete_explore_section', { p_id: id }),

  async auditLog(limit = 100) {
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select('id, action, admin_id, target_user_id, details, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new ApiError(error.message)
    return data ?? []
  },

  storageUsage: () =>
    rpc<{ bucket: string; objects: number; bytes: number }[]>('admin_storage_usage'),
}
