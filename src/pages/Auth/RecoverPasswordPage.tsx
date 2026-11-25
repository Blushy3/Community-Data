import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Alert } from '@/components/ui/Bits'
import { PageHeader } from '@/components/ui/PageHeader'
import { authApi, describeError } from '@/lib/api'

/**
 * Password recovery with a one-time recovery code (README §5).
 * Accounts have no email addresses, so email links are impossible by design.
 */
export function RecoverPasswordPage() {
  const [username, setUsername] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newCode, setNewCode] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await authApi.recover({ username, recoveryCode, newPassword })
      setNewCode(result.recovery_code ?? null)
    } catch (submitError) {
      setError(describeError(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (newCode) {
    return (
      <div>
        <PageHeader
          eyebrow="Password changed"
          title="Store your new recovery code"
          description="The previous code was invalidated. This one is shown only once."
        />
        <div className="page-container py-8">
          <div className="surface-card max-w-md px-5 py-6">
            <p className="rounded-md border border-line-strong bg-surface-2 px-3 py-3 font-mono text-lg tracking-widest text-ink">
              {newCode}
            </p>
            <p className="mt-4">
              <Link to="/login" className="btn-primary">
                Go to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Recovery"
        title="Reset your password"
        description="Use the recovery code you saved after registration."
      />

      <div className="page-container py-8">
        <div className="surface-card max-w-md px-5 py-6">
          {error ? (
            <div className="mb-5">
              <Alert tone="error">{error}</Alert>
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="label" htmlFor="recovery-username">
                Username
              </label>
              <input
                id="recovery-username"
                className="input"
                type="text"
                autoComplete="username"
                spellCheck={false}
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="recovery-code">
                Recovery code
              </label>
              <input
                id="recovery-code"
                className="input font-mono"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value.toUpperCase())}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="new-password">
                New password
              </label>
              <input
                id="new-password"
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="new-password-confirm">
                Confirm new password
              </label>
              <input
                id="new-password-confirm"
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
              {isSubmitting ? 'Updating…' : 'Set new password'}
            </button>
          </form>

          <p className="mt-4 text-xs text-ink-4">
            A recovery code can be used once. If you lost both the password and the code,
            automatic recovery is not possible.
          </p>
          <p className="mt-2 text-xs text-ink-4">
            <Link to="/login" className="text-ink-2 hover:text-ink">
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
