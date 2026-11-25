import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Alert, Avatar } from '@/components/ui/Bits'
import { EmptyState } from '@/components/ui/PageHeader'
import { useAuth } from '@/context/AuthContext'
import { contentApi, describeError, profilesApi } from '@/lib/api'
import type { MemberRow } from '@/lib/api'
import type { CommunityUpdate } from '@/types'
import { formatDate } from '@/utils/format'

type UpdateTeaser = Pick<CommunityUpdate, 'id' | 'title' | 'slug' | 'description' | 'published_at'>

export function HomePage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ members: 0, achievements: 0, updates: 0 })
  const [updates, setUpdates] = useState<UpdateTeaser[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    Promise.all([contentApi.stats(), contentApi.publishedUpdates(3), profilesApi.recent(4)])
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
        <div className="page-container py-14 sm:py-20">
          <p className="section-eyebrow">Community portal</p>
          <h1 className="mt-3 max-w-3xl text-balance">
            A public home for our community, its people and its history.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-ink-2">
            Community Data documents who we are: member profiles, achievements, official updates
            and thematic sections. Discord stays the place where we talk - this is where we keep
            what matters.
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

      <section aria-labelledby="statistics-heading" className="border-b border-line">
        <div className="page-container py-10">
          <h2 id="statistics-heading" className="text-sm font-medium text-ink-3">
            Community statistics
          </h2>

          {error ? (
            <div className="mt-4">
              <Alert tone="error">{error}</Alert>
            </div>
          ) : null}

          <dl className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Registered members', value: stats.members },
              { label: 'Achievements', value: stats.achievements },
              { label: 'Published updates', value: stats.updates },
            ].map((item) => (
              <div key={item.label} className="surface-card px-4 py-4">
                <dt className="text-xs text-ink-4">{item.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                  {isLoading ? '-' : item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="page-container grid gap-6 py-10 lg:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-medium text-ink-3">Latest official updates</h2>
              <Link to="/updates" className="text-xs text-ink-4 hover:text-ink">
                All updates →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {updates.length === 0 ? (
                <EmptyState
                  title="No published updates yet"
                  description="Announcements published by administrators will be listed here."
                />
              ) : (
                updates.map((update) => (
                  <Link
                    key={update.id}
                    to={`/updates/${update.slug}`}
                    className="surface-card block px-4 py-4 transition-colors duration-150 hover:border-line-strong hover:bg-surface-2"
                  >
                    <p className="text-sm font-medium text-ink">{update.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-3">{update.description}</p>
                    <p className="mt-2 text-xs text-ink-4">{formatDate(update.published_at)}</p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-medium text-ink-3">Recently joined members</h2>
              <Link to="/members" className="text-xs text-ink-4 hover:text-ink">
                All members →
              </Link>
            </div>

            <div className="mt-4 space-y-2">
              {members.length === 0 ? (
                <EmptyState
                  title="No members to show yet"
                  description="Newly registered community members will appear here."
                />
              ) : (
                members.map((member) => (
                  <Link
                    key={member.id}
                    to={`/members/${member.username}`}
                    className="surface-card flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:border-line-strong hover:bg-surface-2"
                  >
                    <Avatar path={member.avatar_path} name={member.display_name} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">
                        {member.display_name}
                      </span>
                      <span className="block truncate text-xs text-ink-4">
                        @{member.username}
                      </span>
                    </span>
                    <span className="ml-auto text-xs text-ink-4">
                      {formatDate(member.created_at)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
