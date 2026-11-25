import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { Alert, Spinner } from '@/components/ui/Bits'
import { useAuth } from '@/context/AuthContext'

const adminNav = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/registration', label: 'Registration' },
  { to: '/admin/achievements', label: 'Achievements' },
  { to: '/admin/updates', label: 'Updates' },
  { to: '/admin/explore', label: 'Explore' },
  { to: '/admin/storage', label: 'Storage' },
  { to: '/admin/audit-log', label: 'Audit log' },
] as const

function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="badge">Admin</span>
            <Link to="/" className="text-sm text-ink-3 hover:text-ink">
              ← Back to site
            </Link>
          </div>
          <p className="text-xs text-ink-4">Community Data management panel</p>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
        <nav aria-label="Admin navigation" className="lg:w-56 lg:shrink-0">
          <ul className="flex flex-wrap gap-1 lg:flex-col">
            {adminNav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={'end' in item ? item.end : false}
                  className={({ isActive }) =>
                    isActive
                      ? 'block rounded-md bg-surface-2 px-3 py-2 text-sm text-ink'
                      : 'block rounded-md px-3 py-2 text-sm text-ink-3 hover:bg-surface-2 hover:text-ink'
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

/**
 * Admin layout (README §8). The guard here is UX only - every operation is
 * re-authorized by database functions, so bypassing the UI gains nothing.
 */
export function AdminLayout() {
  const { status, profile, isAdmin } = useAuth()

  if (status === 'loading') {
    return (
      <AdminShell>
        <Spinner label="Checking your permissions…" />
      </AdminShell>
    )
  }

  if (!isAdmin) {
    return (
      <AdminShell>
        <Alert tone="error">
          {profile
            ? 'This account does not have administrator permissions.'
            : 'Sign in with an administrator account to open this panel.'}
        </Alert>
        <p className="mt-4 flex gap-2">
          <Link to="/login" className="btn-primary">
            Sign in
          </Link>
          <Link to="/" className="btn-secondary">
            Back to site
          </Link>
        </p>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  )
}
