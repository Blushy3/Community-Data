import { Link } from 'react-router-dom'

const footerNav = [
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
    ],
  },
  {
    heading: 'Project',
    links: [
      { to: '/transparency', label: 'AI transparency' },
      { to: '/login', label: 'Sign in' },
      { to: '/register', label: 'Create account' },
    ],
  },
] as const

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface/40">
      <div className="page-container grid gap-10 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <p className="text-sm font-semibold text-ink">Community Data</p>
          <p className="mt-2 text-sm text-ink-3">
            The public portal of our community - members, achievements, news and
            everything worth knowing. Conversations still happen on Discord.
          </p>
          <p className="mt-4 text-xs text-ink-4">
            Built with AI. Guided by people.{' '}
            <Link to="/transparency" className="text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink">
              Read more
            </Link>
          </p>
        </div>

        {footerNav.map((group) => (
          <nav key={group.heading} aria-label={group.heading}>
            <p className="section-eyebrow">{group.heading}</p>
            <ul className="mt-3 space-y-2">
              {group.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-ink-3 transition-colors duration-150 hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
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
