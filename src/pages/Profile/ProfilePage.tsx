import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Alert, Avatar, RoleBadge, Spinner } from '@/components/ui/Bits'
import { EmptyState } from '@/components/ui/PageHeader'
import { describeError, profilesApi } from '@/lib/api'
import type { AwardRow } from '@/lib/api'
import type { Profile, Role } from '@/types'
import { formatDate } from '@/utils/format'
import { publicImageUrl } from '@/utils/storage'

const SOCIAL_LABELS: Record<string, string> = {
  discord: 'Discord',
  twitter: 'X / Twitter',
  github: 'GitHub',
  youtube: 'YouTube',
  twitch: 'Twitch',
  steam: 'Steam',
  website: 'Website',
}

export function ProfilePage() {
  const { username = '' } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [awards, setAwards] = useState<AwardRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)

    profilesApi
      .getByUsername(username)
      .then(async (found) => {
        if (!active) return
        setProfile(found)
        if (found) {
          const [nextRoles, nextAwards] = await Promise.all([
            profilesApi.getRoles(found.id),
            profilesApi.getAwards(found.id),
          ])
          if (!active) return
          setRoles(nextRoles)
          setAwards(nextAwards)
        }
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
  }, [username])

  if (isLoading) {
    return (
      <div className="page-container py-16">
        <Spinner label="Loading profile…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container py-16">
        <Alert tone="error">{error}</Alert>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="page-container py-16">
        <EmptyState
          title="Profile not found"
          description="This username does not exist or the account is suspended."
        >
          <Link to="/members" className="btn-secondary">
            Browse members
          </Link>
        </EmptyState>
      </div>
    )
  }

  const bannerUrl = publicImageUrl('banners', profile.banner_path)
  const socialLinks = Object.entries(profile.social_links ?? {}).filter(([, value]) => value)
  const games = profile.favorite_games ?? []

  return (
    <div>
      <div className="border-b border-line">
        <div className="page-container py-6">
          <div className="relative h-32 overflow-hidden rounded-lg border border-line bg-surface-2 sm:h-44">
            {bannerUrl ? (
              <img src={bannerUrl} alt="" className="size-full animate-fade object-cover" />
            ) : null}
          </div>
          <div className="relative -mt-10 flex flex-wrap items-end gap-4 px-1">
            <Avatar path={profile.avatar_path} name={profile.display_name} size="lg" />
            <div className="min-w-0 pb-1">
              <h1 className="truncate text-2xl">{profile.display_name}</h1>
              <p className="text-sm text-ink-4">@{profile.username}</p>
            </div>
            <div className="ml-auto flex flex-wrap gap-1.5 pb-1">
              {roles.length === 0 ? <span className="badge">Member</span> : null}
              {roles.map((role) => (
                <RoleBadge key={role} role={role} />
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-4">Joined {formatDate(profile.created_at)}</p>
        </div>
      </div>

      <div className="page-container grid gap-6 py-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-medium text-ink-3">About</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">
              {profile.bio?.trim() ? profile.bio : 'No bio written yet.'}
            </p>
          </section>

          <section>
            <h2 className="text-sm font-medium text-ink-3">Achievements ({awards.length})</h2>
            {awards.length === 0 ? (
              <p className="mt-2 text-sm text-ink-4">No achievements awarded yet.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {awards.map((award) => (
                  <li
                    key={award.achievement_id}
                    className="badge transition-colors duration-150 hover:border-line-strong hover:text-ink"
                  >
                    {award.achievements?.name ?? 'Achievement'}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section>
            <h2 className="text-sm font-medium text-ink-3">Social links</h2>
            {socialLinks.length === 0 ? (
              <p className="mt-2 text-sm text-ink-4">No links added.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {socialLinks.map(([key, value]) => (
                  <li key={key} className="text-sm">
                    <span className="text-ink-4">{SOCIAL_LABELS[key] ?? key}: </span>
                    {value.startsWith('http') ? (
                      <a
                        href={value}
                        className="text-ink-2 underline decoration-line-strong underline-offset-2 hover:text-ink"
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {value.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="text-ink-2">{value}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-medium text-ink-3">Favourite games</h2>
            {games.length === 0 ? (
              <p className="mt-2 text-sm text-ink-4">No games listed.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {games.map((game) => (
                  <li key={game} className="badge">
                    {game}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
