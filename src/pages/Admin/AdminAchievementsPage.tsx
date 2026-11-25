import { useEffect, useState } from 'react'

import { Alert, Spinner } from '@/components/ui/Bits'
import { adminApi, contentApi, describeError, profilesApi } from '@/lib/api'
import type { Achievement } from '@/types'
import { slugify } from '@/utils/format'

export function AdminAchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')

  const [grantUsername, setGrantUsername] = useState('')
  const [grantAchievement, setGrantAchievement] = useState('')

  const load = async () => {
    setIsLoading(true)
    try {
      setAchievements(await contentApi.achievements())
    } catch (loadError) {
      setError(describeError(loadError))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setSlug('')
    setDescription('')
  }

  const run = async (action: () => Promise<void>, message: string) => {
    setIsSaving(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      setNotice(message)
      await load()
    } catch (actionError) {
      setError(describeError(actionError))
    } finally {
      setIsSaving(false)
    }
  }

  const resolveTarget = async () => {
    const target = await profilesApi.getByUsername(grantUsername.trim().toLowerCase())
    if (!target) throw new Error('No member with that username.')
    return target.id
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl">Achievements</h1>
        <p className="mt-1 text-sm text-ink-3">
          Definitions and awards. Members can never award achievements to themselves.
        </p>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <section className="surface-card space-y-3 px-5 py-5">
        <p className="text-sm font-medium text-ink">
          {editingId ? 'Edit achievement' : 'New achievement'}
        </p>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            void run(async () => {
              await adminApi.saveAchievement({
                id: editingId,
                slug: slug || slugify(name),
                name: name.trim(),
                description: description.trim(),
              })
              resetForm()
            }, editingId ? 'Achievement updated.' : 'Achievement created.')
          }}
        >
          <div>
            <label className="label" htmlFor="ach-name">
              Name
            </label>
            <input
              id="ach-name"
              className="input"
              value={name}
              maxLength={60}
              onChange={(event) => {
                setName(event.target.value)
                if (!editingId) setSlug(slugify(event.target.value))
              }}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="ach-slug">
              Identifier (slug)
            </label>
            <input
              id="ach-slug"
              className="input font-mono"
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ach-desc">
              Description
            </label>
            <textarea
              id="ach-desc"
              className="input min-h-[72px]"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {editingId ? 'Save changes' : 'Create achievement'}
            </button>
            {editingId ? (
              <button type="button" className="btn-ghost" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      {isLoading ? (
        <Spinner label="Loading achievements…" />
      ) : (
        <ul className="surface-card divide-y divide-line">
          {achievements.length === 0 ? (
            <li className="px-5 py-4 text-sm text-ink-4">No achievements yet.</li>
          ) : (
            achievements.map((achievement) => (
              <li
                key={achievement.id}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink">{achievement.name}</p>
                  <p className="text-xs text-ink-3">{achievement.description}</p>
                  <p className="mt-1 font-mono text-[11px] text-ink-4">{achievement.slug}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setEditingId(achievement.id)
                      setName(achievement.name)
                      setSlug(achievement.slug)
                      setDescription(achievement.description)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={isSaving}
                    onClick={() => {
                      if (!window.confirm(`Delete "${achievement.name}" and all its awards?`)) return
                      void run(
                        () => adminApi.deleteAchievement(achievement.id),
                        'Achievement deleted.',
                      )
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      )}

      <section className="surface-card space-y-3 px-5 py-5">
        <p className="text-sm font-medium text-ink">Grant / revoke an achievement</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input sm:max-w-[200px]"
            placeholder="username"
            value={grantUsername}
            onChange={(event) => setGrantUsername(event.target.value)}
          />
          <select
            className="input sm:max-w-[240px]"
            value={grantAchievement}
            onChange={(event) => setGrantAchievement(event.target.value)}
          >
            <option value="">Select achievement…</option>
            {achievements.map((achievement) => (
              <option key={achievement.id} value={achievement.id}>
                {achievement.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary"
            disabled={isSaving || !grantAchievement || !grantUsername}
            onClick={() =>
              void run(async () => {
                await adminApi.assignAchievement(await resolveTarget(), grantAchievement)
                setGrantUsername('')
              }, 'Achievement granted.')
            }
          >
            Grant
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={isSaving || !grantAchievement || !grantUsername}
            onClick={() =>
              void run(async () => {
                await adminApi.revokeAchievement(await resolveTarget(), grantAchievement)
              }, 'Achievement revoked.')
            }
          >
            Revoke
          </button>
        </div>
      </section>
    </div>
  )
}
