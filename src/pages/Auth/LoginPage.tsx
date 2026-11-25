import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Alert } from '@/components/ui/Bits'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/context/AuthContext'
import { authApi, describeError } from '@/lib/api'

/**
 * Username + password sign-in (README §5). The username → internal identity
 * mapping happens in the `auth` Edge Function; the user never sees an email.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const { refresh } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await authApi.login(username, password)
      await refresh()
      navigate(`/members/${username.trim().toLowerCase()}`, { replace: true })
    } catch (submitError) {
      setError(describeError(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Sign in"
        title="Welcome back"
        description="Sign in with your community username and password."
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
              <label className="label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
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
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 flex flex-col gap-1 text-xs text-ink-4">
            <Link to="/recover" className="text-ink-2 hover:text-ink">
              Lost your password? Use your recovery code
            </Link>
            <span>
              No account?{' '}
              <Link to="/register" className="text-ink-2 hover:text-ink">
                Register with an invitation code
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
