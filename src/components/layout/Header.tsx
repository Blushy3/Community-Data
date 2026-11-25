import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'

import { Avatar } from '@/components/ui/Bits'
import { useAuth } from '@/context/AuthContext'

const primaryNav = [
  { to: '/', label: 'Home', end: true },
  { to: '/members', label: 'Members' },
  { to: '/achievements', label: 'Achievements' },
  { to: '/community', label: 'Community' },
  { to: '/explore', label: 'Explore' },
  { to: '/updates', label: 'Updates' },
] as const

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Community Data — home">
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-md border border-line bg-surface-2"
      >
        <span className="text-[13px] font-semibold tracking-tight text-ink">CD</span>
      </span>
      <span className="text-sm font-semibold tracking-tight text-ink">Community Data</span>
    </Link>
  )
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { status, profile, isAdmin, signOut } = useAuth()

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const accountLinks = profile ? (
    <>
      <Link to={`/members/${profile.username}`} className="btn-ghost">
        My profile
      </Link>
      <Link to="/settings" className="btn-secondary">
        Settings
      </Link>
      {isAdmin ? (
        <Link to="/admin" className="btn-secondary">
          Admin
        </Link>
      ) : null}
      <button type="button" className="btn-ghost" onClick={handleSignOut}>
        Sign out
      </button>
    </>
  ) : (
    <>
      <Link to="/login" className="btn-ghost">
        Sign in
      </Link>
      <Link to="/register" className="btn-primary">
        Join
      </Link>
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-sm">
      <div className="page-container flex h-14 items-center justify-between gap-4">
        <Brand />

        <nav aria-label="Main navigation" className="hidden items-center gap-0.5 lg:flex">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/discord" className="btn-secondary">
            Discord
          </Link>
          {status === 'signed-in' && profile ? (
            <Link to="/settings" aria-label="Account settings">
              <Avatar path={profile.avatar_path} name={profile.display_name} size="sm" />
            </Link>
          ) : null}
          {status === 'loading' ? null : accountLinks}
        </div>

        <button
          type="button"
          className="btn-secondary lg:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {isMenuOpen ? (
        <div id="mobile-navigation" className="border-t border-line bg-surface lg:hidden">
          <nav aria-label="Mobile navigation" className="page-container flex flex-col gap-1 py-3">
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : false}
                className={({ isActive }) =>
                  isActive
                    ? 'rounded-md bg-surface-2 px-3 py-2 text-sm text-ink'
                    : 'rounded-md px-3 py-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink'
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/discord"
              className="rounded-md px-3 py-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              Discord
            </Link>
            <div className="mt-2 flex flex-wrap gap-2 border-t border-line pt-3">
              {accountLinks}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
