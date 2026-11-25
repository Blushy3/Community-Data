import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Alert, Avatar } from '@/components/ui/Bits'
import { useAuth } from '@/context/AuthContext'
import { contentApi, describeError, profilesApi } from '@/lib/api'
import type { MemberRow } from '@/lib/api'
import type { CommunityUpdate } from '@/types'
import { formatDate } from '@/utils/format'

type UpdateTeaser = Pick<CommunityUpdate, 'id' | 'title' | 'slug' | 'published_at'>

export function HomePage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ members: 0, achievements: 0, updates: 0 })
  const [updates, setUpdates] = useState<UpdateTeaser[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    Promise.all([contentApi.stats(), contentApi.publishedUpdates(3), profilesApi.recent(5)])
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
    <div className="page-container py-12 sm:py-16">
      <section className="max-w-2xl">
        <p className="section-eyebrow">Community portal</p>
        <h1 className="mt-3">Our community, in one place.</h1>
        <p className="mt-3 text-ink-2">
          Members, achievements and official updates. Live conversation stays on Discord.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
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
            Discord
          </Link>
        </div>
      </section>

      {error ? (
        <div className="mt-8">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <dl className="mt-12 grid grid-cols-3 divide-x divide-line border-y border-line">
        {[
          { label: 'Members', value: stats.members },
          { label: 'Achievements', value: stats.achievements },
          { label: 'Updates', value: stats.updates },
        ].map((item) => (
          <div key={item.label} className="px-4 py-4 first:pl-0">
            <dt className="text-xs text-ink-4">{item.label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">
              {isLoading ? '-' : item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium text-ink-3">Latest updates</h2>
            <Link to="/updates" className="text-xs text-ink-4 hover:text-ink">
              All
            </Link>
          </div>

          {updates.length === 0 ? (
            <p className="mt-3 border-t border-line py-4 text-sm text-ink-4">
              Nothing published yet.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line border-t border-line">
              {updates.map((update) => (
                <li key={update.id}>
                  <Link
                    to={`/updates/${update.slug}`}
                    className="flex items-baseline justify-between gap-4 py-3 text-sm text-ink-2 transition-colors duration-150 hover:text-ink"
                  >
                    <span className="truncate">{update.title}</span>
                    <span className="shrink-0 text-xs text-ink-4">
                      {formatDate(update.published_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium text-ink-3">New members</h2>
            <Link to="/members" className="text-xs text-ink-4 hover:text-ink">
              All
            </Link>
          </div>

          {members.length === 0 ? (
            <p className="mt-3 border-t border-line py-4 text-sm text-ink-4">
              No members yet.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line border-t border-line">
              {members.map((member) => (
                <li key={member.id}>
                  <Link
                    to={`/members/${member.username}`}
                    className="flex items-center gap-3 py-2.5 transition-colors duration-150 hover:text-ink"
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
        </section>
      </div>
    </div>
  )
}
