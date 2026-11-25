import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Alert, Spinner } from '@/components/ui/Bits'
import { PageHeader } from '@/components/ui/PageHeader'
import { authApi, contentApi, describeError } from '@/lib/api'

/**
 * Registration (README §5): exactly five fields, no email, no phone, no Discord.
 * The invitation code is verified by the `auth` Edge Function, never here.
 */
export function RegisterPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'checking' | 'founder' | 'member' | 'closed'>('checking')

  const [invitationCode, setInvitationCode] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issued, setIssued] = useState<{ username: string; recoveryCode: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true

    Promise.all([authApi.bootstrapAvailable(), contentApi.settings()])
      .then(([needsFounder, settings]) => {
        if (!active) return
        if (needsFounder) setMode('founder')
        else if (settings.registration_enabled) setMode('member')
        else setMode('closed')
      })
      .catch(() => {
        if (active) setMode('closed')
      })

    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const result =
        mode === 'founder'
          ? await authApi.bootstrap({ username, displayName, password })
          : await authApi.register({ invitationCode, username, displayName, password })

      if (!result.recovery_code) throw new Error('missing recovery code')
      setIssued({ username: result.username ?? username, recoveryCode: result.recovery_code })
    } catch (submitError) {
      setError(describeError(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (issued) {
    return (
      <div>
        <PageHeader
          eyebrow="Account created"
          title="Save your recovery code"
          description="Shown only once. It is the only way to reset your password."
        />
        <div className="page-container py-8">
          <div className="surface-card max-w-md px-5 py-6">
            <p className="text-sm text-ink-2">
              Recovery code for <span className="text-ink">@{issued.username}</span>:
            </p>
            <p className="mt-3 rounded-md border border-line-strong bg-surface-2 px-3 py-3 font-mono text-lg tracking-widest text-ink">
              {issued.recoveryCode}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(issued.recoveryCode)
                  setCopied(true)
                }}
              >
                {copied ? 'Copied' : 'Copy code'}
              </button>
              <button type="button" className="btn-primary" onClick={() => navigate('/login')}>
                I saved it - sign in
              </button>
            </div>
            <p className="mt-4 text-xs text-ink-4">
              Only a hash is stored. If the code is lost, nobody can recover the account for you.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'checking') {
    return (
      <div className="page-container py-16">
        <Spinner label="Checking registration status…" />
      </div>
    )
  }

  if (mode === 'closed') {
    return (
      <div>
        <PageHeader
          eyebrow="Registration"
          title="Registration is closed"
          description="An administrator has disabled new registrations."
        />
        <div className="page-container py-8">
          <div className="surface-card max-w-md px-5 py-6 text-sm text-ink-3">
            <p>
              Registration is currently disabled. Ask an administrator for an invitation when it
              is open again.
            </p>
            <p className="mt-4">
              <Link to="/login" className="text-ink-2 hover:text-ink">
                ← Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  const isFounder = mode === 'founder'

  return (
    <div>
      <PageHeader
        eyebrow={isFounder ? 'First setup' : 'Create account'}
        title={isFounder ? 'Create the founder account' : 'Join the community'}
        description={
          isFounder
            ? 'No accounts exist yet. This account becomes the first administrator.'
            : 'Registration requires the shared community invitation code.'
        }
      />

      <div className="page-container py-8">
        <div className="surface-card max-w-md px-5 py-6">
          {isFounder ? (
            <div className="mb-5">
              <Alert tone="warning">
                Founder mode works only while no accounts exist. After this step everyone else
                needs the invitation code.
              </Alert>
            </div>
          ) : null}

          {error ? (
            <div className="mb-5">
              <Alert tone="error">{error}</Alert>
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isFounder ? (
              <div>
                <label className="label" htmlFor="invitation-code">
                  Invitation code
                </label>
                <input
                  id="invitation-code"
                  className="input"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={invitationCode}
                  onChange={(event) => setInvitationCode(event.target.value)}
                  required
                />
              </div>
            ) : null}

            <div>
              <label className="label" htmlFor="display-name">
                Display name
              </label>
              <input
                id="display-name"
                className="input"
                type="text"
                autoComplete="nickname"
                maxLength={40}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className="input"
                type="text"
                autoComplete="username"
                spellCheck={false}
                maxLength={20}
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                required
              />
              <p className="mt-1.5 text-xs text-ink-4">
                3-20 characters: a-z, 0-9, underscore. Used to sign in, cannot be changed.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <p className="mt-1.5 text-xs text-ink-4">
                At least 8 characters. A longer passphrase is safer.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="password-confirm">
                Confirm password
              </label>
              <input
                id="password-confirm"
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-xs text-ink-4">
            Already registered?{' '}
            <Link to="/login" className="text-ink-2 hover:text-ink">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
