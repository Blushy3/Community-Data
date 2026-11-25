import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'

function buildGroups(signedIn: boolean, isAdmin: boolean) {
  return [
    {
      heading: 'Community',
      links: [
        { to: '/members', label: 'Members' },
        { to: '/achievements', label: 'Achievements' },
        { to: '/updates', label: 'Updates' },
      ],
    },
    {
      heading: 'Content',
      links: [
        { to: '/explore', label: 'Explore' },
        { to: '/discord', label: 'Discord' },
        { to: '/transparency', label: 'AI transparency' },
      ],
    },
    {
      heading: 'Account',
      links: signedIn
        ? [
            { to: '/settings', label: 'Account settings' },
            ...(isAdmin ? [{ to: '/admin', label: 'Admin panel' }] : []),
          ]
        : [
            { to: '/login', label: 'Sign in' },
            { to: '/register', label: 'Create account' },
          ],
    },
  ]
}

export function Footer() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const groups = buildGroups(profile !== null, isAdmin)

  return (
    <footer className="mt-16 border-t border-line bg-surface/40">
      <div className="page-container grid gap-10 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <p className="text-sm font-semibold text-ink">Community Data</p>
          <p className="mt-2 text-sm text-ink-3">
            The public portal of our community: members, achievements, news and
            everything worth knowing. Conversations still happen on Discord.
          </p>
          <p className="mt-4 text-xs text-ink-4">
            Built with AI. Guided by people.
          </p>
        </div>

        {groups.map((group) => (
          <nav key={group.heading} aria-label={group.heading}>
            <p className="section-eyebrow">{group.heading}</p>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="inline-block text-sm text-ink-3 duration-150 transition-[color,transform] hover:translate-x-0.5 hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {group.heading === 'Account' && profile ? (
                <li>
                  <button
                    type="button"
                    className="text-sm text-ink-3 transition-colors duration-150 hover:text-ink"
                    onClick={() => {
                      void signOut().then(() => navigate('/'))
                    }}
                  >
                    Sign out
                  </button>
                </li>
              ) : null}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="page-container flex flex-col gap-2 py-4 text-xs text-ink-4 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Community Data. All rights reserved.</p>
          <p>Discord remains our primary space for live communication.</p>
        </div>
      </div>
    </footer>
  )
}
