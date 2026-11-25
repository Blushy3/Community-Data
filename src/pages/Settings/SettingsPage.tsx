import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Alert, Avatar, Spinner } from '@/components/ui/Bits'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/context/AuthContext'
import { describeError, profilesApi } from '@/lib/api'
import { prepareImage } from '@/utils/image'
import {
  IMAGE_LIMITS,
  deleteProfileImage,
  publicImageUrl,
  uploadProfileImage,
} from '@/utils/storage'
import type { Bucket } from '@/utils/storage'

const SOCIAL_FIELDS = [
  { key: 'discord', label: 'Discord' },
  { key: 'twitter', label: 'X / Twitter' },
  { key: 'github', label: 'GitHub' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'twitch', label: 'Twitch' },
  { key: 'steam', label: 'Steam' },
  { key: 'website', label: 'Website' },
] as const

export function SettingsPage() {
  const navigate = useNavigate()
  const { status, profile, refresh, signOut } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [socials, setSocials] = useState<Record<string, string>>({})
  const [games, setGames] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [uploading, setUploading] = useState<Bucket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name)
    setBio(profile.bio ?? '')
    setSocials(
      Object.fromEntries(
        Object.entries(profile.social_links ?? {}).map(([key, value]) => [key, String(value)]),
      ),
    )
    setGames((profile.favorite_games ?? []).join(', '))
  }, [profile])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!profile) return
    setError(null)
    setNotice(null)
    setIsSaving(true)

    try {
      const socialLinks = Object.fromEntries(
        Object.entries(socials)
          .map(([key, value]) => [key, value.trim()])
          .filter(([, value]) => value.length > 0),
      )

      const favoriteGames = games
        .split(',')
        .map((game) => game.trim())
        .filter(Boolean)
        .slice(0, 20)

      await profilesApi.updateOwn(profile.id, {
        display_name: displayName.trim(),
        bio: bio.trim() ? bio.trim() : null,
        social_links: socialLinks,
        favorite_games: favoriteGames,
      })

      await refresh()
      setNotice('Profile saved.')
    } catch (saveError) {
      setError(describeError(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Required order (README §7): validate → upload → update the database →
   * only then delete the previous file. On failure the old image stays.
   */
  const replaceImage = async (bucket: Bucket, file: File) => {
    if (!profile) return
    setError(null)
    setNotice(null)
    setUploading(bucket)

    const field = bucket === 'avatars' ? 'avatar_path' : 'banner_path'
    const oldPath = profile[field]
    let newPath: string | null = null

    try {
      const blob = await prepareImage(file, IMAGE_LIMITS[bucket])
      newPath = await uploadProfileImage(bucket, profile.id, blob)

      await profilesApi.updateOwn(profile.id, { [field]: newPath })
      await refresh()

      await deleteProfileImage(bucket, oldPath)
      setNotice(bucket === 'avatars' ? 'Avatar updated.' : 'Banner updated.')
    } catch (uploadError) {
      if (newPath) await deleteProfileImage(bucket, newPath)
      setError(describeError(uploadError))
    } finally {
      setUploading(null)
    }
  }

  if (status === 'loading') {
    return (
      <div className="page-container py-16">
        <Spinner label="Loading your account…" />
      </div>
    )
  }

  if (status === 'signed-out' || !profile) {
    return (
      <div className="page-container py-16">
        <Alert tone="warning">You need to be signed in to edit your profile.</Alert>
        <p className="mt-4">
          <Link to="/login" className="btn-primary">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  const bannerUrl = publicImageUrl('banners', profile.banner_path)

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Profile settings"
        description="Edit your public profile. Username and role cannot be changed here."
      />

      <div className="page-container space-y-6 py-8">
        {error ? <Alert tone="error">{error}</Alert> : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}

        <section className="surface-card px-5 py-5">
          <h2 className="text-sm font-medium text-ink">Profile images</h2>

          <div className="mt-4 flex flex-wrap items-start gap-6">
            <div className="flex items-center gap-4">
              <Avatar path={profile.avatar_path} name={profile.display_name} size="lg" />
              <div>
                <p className="text-xs text-ink-3">Avatar · WebP · max 512 px</p>
                <label className="btn-secondary mt-2 cursor-pointer">
                  {uploading === 'avatars' ? 'Uploading…' : 'Replace avatar'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading !== null}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void replaceImage('avatars', file)
                      event.target.value = ''
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="min-w-[240px] flex-1">
              <div
                className="h-24 rounded-md border border-line bg-surface-2"
                style={
                  bannerUrl
                    ? {
                        backgroundImage: `url(${bannerUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
              />
              <p className="mt-2 text-xs text-ink-3">Banner · WebP · max 1600 px</p>
              <label className="btn-secondary mt-2 cursor-pointer">
                {uploading === 'banners' ? 'Uploading…' : 'Replace banner'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void replaceImage('banners', file)
                    event.target.value = ''
                  }}
                />
              </label>
            </div>
          </div>
        </section>

        <form className="surface-card space-y-5 px-5 py-5" onSubmit={handleSave}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="display-name">
                Display name
              </label>
              <input
                id="display-name"
                className="input"
                type="text"
                maxLength={40}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="username-readonly">
                Username
              </label>
              <input
                id="username-readonly"
                className="input opacity-60"
                type="text"
                value={profile.username}
                readOnly
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="bio">
              Bio
            </label>
            <textarea
              id="bio"
              className="input min-h-[96px] resize-y"
              maxLength={500}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
            <p className="mt-1.5 text-xs text-ink-4">{bio.length}/500 characters</p>
          </div>

          <div>
            <p className="label">Social links</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {SOCIAL_FIELDS.map((field) => (
                <input
                  key={field.key}
                  className="input"
                  type="text"
                  placeholder={field.label}
                  value={socials[field.key] ?? ''}
                  onChange={(event) =>
                    setSocials((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                />
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="games">
              Favourite games
            </label>
            <input
              id="games"
              className="input"
              type="text"
              placeholder="Minecraft, Valorant, …"
              value={games}
              onChange={(event) => setGames(event.target.value)}
            />
            <p className="mt-1.5 text-xs text-ink-4">Comma separated, up to 20 games.</p>
          </div>

          <div className="flex items-center gap-2">
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
            <Link to={`/members/${profile.username}`} className="btn-ghost">
              View public profile
            </Link>
          </div>
        </form>

        <section className="surface-card flex flex-wrap items-center justify-between gap-3 px-5 py-5">
          <div>
            <p className="text-sm font-medium text-ink">Session</p>
            <p className="text-xs text-ink-3">Signed in as @{profile.username}.</p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              void signOut().then(() => navigate('/'))
            }}
          >
            Sign out
          </button>
        </section>
      </div>
    </div>
  )
}
