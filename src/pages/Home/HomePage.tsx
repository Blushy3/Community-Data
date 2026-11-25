import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Alert, Avatar } from '@/components/ui/Bits'
import { useAuth } from '@/context/AuthContext'
import { contentApi, describeError, profilesApi } from '@/lib/api'
import type { MemberRow } from '@/lib/api'
import type { CommunityUpdate } from '@/types'
import { formatDate } from '@/utils/format'

type UpdateTeaser = Pick<CommunityUpdate, 'id' | 'title' | 'slug' | 'description' | 'published_at'>

const exploreLinks = [
  {
    to: '/achievements',
    title: 'Achievements',
    text: 'Every badge the community can earn.',
  },
  {
    to: '/explore',
    title: 'Explore',
    text: 'Thematic areas: gaming, projects, archive.',
  },
  {
    to: '/discord',
    title: 'Discord',
    text: 'Live conversation, voice and events.',
  },
  {
    to: '/transparency',
    title: 'AI transparency',
    text: 'How AI is used to build this portal.',
  },
] as const

export function HomePage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ members: 0, achievements: 0, updates: 0 })
  const [updates, setUpdates] = useState<UpdateTeaser[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    Promise.all([contentApi.stats(), contentApi.publishedUpdates(4), profilesApi.recent(6)])
      .then(([nextStats, nextUpdates, nextMembers]) => {
        if (!active) return
        setStats(nextStats)
        setUpdates(nextUpdates)
        setMembers(nextMembers)
      })
      .catch((loadError: unknown) => {
        if (active) setError(describeError(loadError))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div>
      <section className="border-b border-line">
        <div className="page-container stagger py-16 sm:py-20">
          <p className="section-eyebrow">Community portal</p>
          <h1 className="mt-3 max-w-2xl text-balance">
            Our community, its people and its history.
          </h1>
          <p className="mt-4 max-w-xl text-base text-ink-2">
            Profiles, achievements and official updates in one place. Live conversation
            stays on Discord.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {profile ? (
              <Link to={`/members/${profile.username}`} className="btn-primary">
                Your profile
              </Link>
            ) : (
              <Link to="/register" className="btn-primary">
                Create your profile
              </Link>
            )}
            <Link to="/discord" className="btn-secondary">
              Join the Discord
            </Link>
          </div>

          <p className="mt-6 text-xs text-ink-4">Built with AI. Guided by people.</p>
        </div>
      </section>

      {error ? (
        <div className="page-container pt-6">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <section aria-label="Statistics" className="border-b border-line">
        <div className="page-container">
          <dl className="grid grid-cols-3 divide-x divide-line">
            {[
              { label: 'Members', value: stats.members },
              { label: 'Achievements', value: stats.achievements },
              { label: 'Updates', value: stats.updates },
            ].map((item) => (
              <div key={item.label} className="px-4 py-5 first:pl-0">
                <dt className="text-xs text-ink-4">{item.label}</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">
                  {isLoading ? '-' : item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="page-container py-12">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium text-ink-3">Latest official updates</h2>
            <Link to="/updates" className="text-xs text-ink-4 hover:text-ink">
              All updates
            </Link>
          </div>

          {updates.length === 0 ? (
            <p className="mt-4 text-sm text-ink-4">Nothing published yet.</p>
          ) : (
            <ul className="stagger mt-4 divide-y divide-line border-t border-line">
              {updates.map((update) => (
                <li key={update.id}>
                  <Link
                    to={`/updates/${update.slug}`}
                    className="group block py-5 transition-colors duration-150"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="text-sm font-medium text-ink group-hover:text-accent-strong">
                        {update.title}
                      </p>
                      <p className="text-xs text-ink-4">{formatDate(update.published_at)}</p>
                    </div>
                    <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-ink-3">
                      {update.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="border-b border-line">
        <div className="page-container py-12">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium text-ink-3">Recently joined members</h2>
            <Link to="/members" className="text-xs text-ink-4 hover:text-ink">
              All members
            </Link>
          </div>

          {members.length === 0 ? (
            <p className="mt-4 text-sm text-ink-4">No members yet.</p>
          ) : (
            <ul className="stagger mt-4 grid gap-x-8 sm:grid-cols-2">
              {members.map((member) => (
                <li key={member.id} className="border-t border-line py-3">
                  <Link
                    to={`/members/${member.username}`}
                    className="flex items-center gap-3 transition-colors duration-150 hover:text-ink"
                  >
                    <Avatar path={member.avatar_path} name={member.display_name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink-2">
                        {member.display_name}
                      </span>
                      <span className="block truncate text-xs text-ink-4">
                        @{member.username}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-ink-4">
                      {formatDate(member.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <div className="page-container py-12">
          <h2 className="text-sm font-medium text-ink-3">Explore</h2>

          <ul className="stagger mt-4 grid gap-x-8 sm:grid-cols-2">
            {exploreLinks.map((item) => (
              <li key={item.to} className="border-t border-line">
                <Link
                  to={item.to}
                  className="link-arrow group flex items-baseline justify-between gap-4 py-4 transition-colors duration-150"
                >
                  <span>
                    <span className="block text-sm font-medium text-ink group-hover:text-accent-strong">
                      {item.title}
                    </span>
                    <span className="block text-sm text-ink-3">{item.text}</span>
                  </span>
                  <span className="arrow shrink-0 text-xs text-ink-4">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
