import { useEffect, useState } from 'react'

import { Alert, Spinner } from '@/components/ui/Bits'
import { adminApi, describeError } from '@/lib/api'
import type { CommunityUpdate } from '@/types'
import { formatDate, slugify } from '@/utils/format'

const EMPTY = { id: null as string | null, title: '', slug: '', description: '', content: '' }

export function AdminUpdatesPage() {
  const [updates, setUpdates] = useState<CommunityUpdate[]>([])
  const [form, setForm] = useState(EMPTY)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    try {
      setUpdates(await adminApi.allUpdates())
    } catch (loadError) {
      setError(describeError(loadError))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async (publish: boolean) => {
    setIsSaving(true)
    setError(null)
    setNotice(null)
    try {
      await adminApi.saveUpdate({
        id: form.id,
        title: form.title.trim(),
        slug: form.slug || slugify(form.title),
        description: form.description.trim(),
        content: form.content,
        publish,
      })
      setForm(EMPTY)
      setNotice(publish ? 'Update published.' : 'Draft saved.')
      await load()
    } catch (saveError) {
      setError(describeError(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"?`)) return
    setIsSaving(true)
    try {
      await adminApi.deleteUpdate(id)
      await load()
    } catch (deleteError) {
      setError(describeError(deleteError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl">Updates</h1>
        <p className="mt-1 text-sm text-ink-3">Drafts stay invisible until published.</p>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <form
        className="surface-card space-y-3 px-5 py-5"
        onSubmit={(event) => {
          event.preventDefault()
          void save(false)
        }}
      >
        <p className="text-sm font-medium text-ink">{form.id ? 'Edit update' : 'New update'}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="input"
            placeholder="Title"
            maxLength={120}
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                title: event.target.value,
                slug: current.id ? current.slug : slugify(event.target.value),
              }))
            }
            required
          />
          <input
            className="input"
            placeholder="slug"
            value={form.slug}
            onChange={(event) =>
              setForm((current) => ({ ...current, slug: slugify(event.target.value) }))
            }
            required
          />
        </div>

        <input
          className="input"
          placeholder="Short description"
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({ ...current, description: event.target.value }))
          }
          required
        />

        <textarea
          className="input min-h-[160px]"
          placeholder="Content"
          value={form.content}
          onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
          required
        />

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-secondary" disabled={isSaving}>
            Save draft
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={isSaving}
            onClick={() => void save(true)}
          >
            Publish
          </button>
          {form.id ? (
            <button type="button" className="btn-ghost" onClick={() => setForm(EMPTY)}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {isLoading ? (
        <Spinner label="Loading updates…" />
      ) : (
        <ul className="surface-card divide-y divide-line">
          {updates.length === 0 ? (
            <li className="px-5 py-4 text-sm text-ink-4">No updates yet.</li>
          ) : (
            updates.map((update) => (
              <li
                key={update.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink">{update.title}</p>
                  <p className="text-xs text-ink-4">
                    {update.status} · {formatDate(update.published_at ?? update.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() =>
                      setForm({
                        id: update.id,
                        title: update.title,
                        slug: update.slug,
                        description: update.description,
                        content: update.content,
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={isSaving}
                    onClick={() => void remove(update.id, update.title)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
