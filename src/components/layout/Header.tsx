import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { Avatar } from '@/components/ui/Bits'
import { useAuth } from '@/context/AuthContext'

const logoUrl = `${import.meta.env.BASE_URL}favicon.svg`

const primaryNav = [
  { to: '/members', label: 'Members' },
  { to: '/achievements', label: 'Achievements' },
  { to: '/explore', label: 'Explore' },
  { to: '/updates', label: 'Updates' },
] as const

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const { status, profile, isAdmin } = useAuth()

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const isSignedIn = status === 'signed-in' && profile !== null

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-sm">
      <div className="page-container flex h-14 items-center gap-5">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Community Data">
          <img src={logoUrl} alt="" width={28} height={28} className="size-7 rounded-md" />
          <span className="text-sm font-semibold tracking-tight whitespace-nowrap text-ink">
            Community Data
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Link to="/discord" className="nav-link hidden sm:inline-flex">
            Discord
          </Link>

          {isSignedIn ? (
            <>
              {isAdmin ? (
                <Link to="/admin" className="nav-link">
                  Admin
                </Link>
              ) : null}
              <Link to="/settings" aria-label="Account settings" title="Account settings">
                <Avatar path={profile.avatar_path} name={profile.display_name} size="sm" />
              </Link>
            </>
          ) : status === 'signed-out' ? (
            <>
              <Link to="/login" className="nav-link">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary px-3 py-1.5">
                Join
              </Link>
            </>
          ) : null}

          <button
            type="button"
            className="btn-ghost px-2 lg:hidden"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div id="mobile-navigation" className="border-t border-line bg-surface lg:hidden">
          <nav aria-label="Mobile" className="page-container flex flex-col gap-0.5 py-3">
            <NavLink to="/" end className="rounded-md px-3 py-2 text-sm text-ink-2">
              Home
            </NavLink>
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive
                    ? 'rounded-md bg-surface-2 px-3 py-2 text-sm text-ink'
                    : 'rounded-md px-3 py-2 text-sm text-ink-2'
                }
              >
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/discord" className="rounded-md px-3 py-2 text-sm text-ink-2">
              Discord
            </NavLink>
            {isSignedIn ? (
              <>
                <NavLink to="/settings" className="rounded-md px-3 py-2 text-sm text-ink-2">
                  Account settings
                </NavLink>
                {isAdmin ? (
                  <NavLink to="/admin" className="rounded-md px-3 py-2 text-sm text-ink-2">
                    Admin panel
                  </NavLink>
                ) : null}
              </>
            ) : (
              <div className="mt-2 flex gap-2 border-t border-line pt-3">
                <Link to="/login" className="btn-secondary flex-1">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary flex-1">
                  Join
                </Link>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  )
}
