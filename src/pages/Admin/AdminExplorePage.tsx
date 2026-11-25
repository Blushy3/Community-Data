import { useEffect, useState } from 'react'

import { Alert, Spinner } from '@/components/ui/Bits'
import { adminApi, describeError } from '@/lib/api'
import type { ExploreSection } from '@/types'
import { slugify } from '@/utils/format'

const EMPTY = {
  id: null as string | null,
  slug: '',
  title: '',
  description: '',
  content: '',
  sortOrder: 0,
  published: false,
}

export function AdminExplorePage() {
  const [sections, setSections] = useState<ExploreSection[]>([])
  const [form, setForm] = useState(EMPTY)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    try {
      setSections(await adminApi.allExploreSections())
    } catch (loadError) {
      setError(describeError(loadError))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl">Explore sections</h1>
        <p className="mt-1 text-sm text-ink-3">
          Order and publish thematic areas. Unpublished sections stay hidden.
        </p>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <form
        className="surface-card space-y-3 px-5 py-5"
        onSubmit={(event) => {
          event.preventDefault()
          setIsSaving(true)
          setError(null)
          setNotice(null)
          void adminApi
            .saveExploreSection({
              id: form.id,
              slug: form.slug || slugify(form.title),
              title: form.title.trim(),
              description: form.description.trim(),
              content: form.content.trim() || null,
              sortOrder: Number(form.sortOrder) || 0,
              published: form.published,
            })
            .then(async () => {
              setNotice('Section saved.')
              setForm(EMPTY)
              await load()
            })
            .catch((saveError: unknown) => setError(describeError(saveError)))
            .finally(() => setIsSaving(false))
        }}
      >
        <p className="text-sm font-medium text-ink">
          {form.id ? 'Edit section' : 'New section'}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="input"
            placeholder="Title"
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
          className="input min-h-[96px]"
          placeholder="Content (optional)"
          value={form.content}
          onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
        />

        <div className="flex flex-wrap items-end gap-3">
          <input
            className="input w-24"
            type="number"
            placeholder="order"
            value={form.sortOrder}
            onChange={(event) =>
              setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))
            }
          />
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(event) =>
                setForm((current) => ({ ...current, published: event.target.checked }))
              }
            />
            Published
          </label>
          <button type="submit" className="btn-primary" disabled={isSaving}>
            Save section
          </button>
          {form.id ? (
            <button type="button" className="btn-ghost" onClick={() => setForm(EMPTY)}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {isLoading ? (
        <Spinner label="Loading sections…" />
      ) : (
        <ul className="surface-card divide-y divide-line">
          {sections.length === 0 ? (
            <li className="px-5 py-4 text-sm text-ink-4">No sections yet.</li>
          ) : (
            sections.map((section) => (
              <li
                key={section.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink">
                    {section.sort_order}. {section.title}{' '}
                    <span className="text-xs text-ink-4">
                      {section.is_published ? '· published' : '· draft'}
                    </span>
                  </p>
                  <p className="text-xs text-ink-4">/{section.slug}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() =>
                      setForm({
                        id: section.id,
                        slug: section.slug,
                        title: section.title,
                        description: section.description,
                        content: section.content ?? '',
                        sortOrder: section.sort_order,
                        published: section.is_published,
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={isSaving}
                    onClick={() => {
                      if (!window.confirm(`Delete "${section.title}"?`)) return
                      setIsSaving(true)
                      void adminApi
                        .deleteExploreSection(section.id)
                        .then(load)
                        .catch((deleteError: unknown) => setError(describeError(deleteError)))
                        .finally(() => setIsSaving(false))
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
    </div>
  )
}
