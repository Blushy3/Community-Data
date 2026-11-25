import { useEffect, useState } from 'react'

import { Alert, Spinner } from '@/components/ui/Bits'
import { adminApi, describeError } from '@/lib/api'
import type { CommunityInfoEntry } from '@/types'

const EMPTY = { key: '', title: '', content: '', sortOrder: 0 }

export function AdminCommunityPage() {
  const [blocks, setBlocks] = useState<CommunityInfoEntry[]>([])
  const [form, setForm] = useState(EMPTY)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    try {
      setBlocks(await adminApi.allCommunityInfo())
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
        <h1 className="text-2xl">Community information</h1>
        <p className="mt-1 text-sm text-ink-3">
          Blocks shown on the public Community page, in order.
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
            .saveCommunityInfo({
              key: form.key,
              title: form.title,
              content: form.content,
              sortOrder: Number(form.sortOrder) || 0,
            })
            .then(async () => {
              setNotice('Block saved.')
              setForm(EMPTY)
              await load()
            })
            .catch((saveError: unknown) => setError(describeError(saveError)))
            .finally(() => setIsSaving(false))
        }}
      >
        <p className="text-sm font-medium text-ink">Add or update a block</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="input"
            placeholder="key (e.g. rules)"
            value={form.key}
            onChange={(event) => setForm((c) => ({ ...c, key: event.target.value }))}
            required
          />
          <input
            className="input sm:col-span-2"
            placeholder="Title"
            value={form.title}
            onChange={(event) => setForm((c) => ({ ...c, title: event.target.value }))}
            required
          />
        </div>
        <textarea
          className="input min-h-[120px]"
          placeholder="Content"
          value={form.content}
          onChange={(event) => setForm((c) => ({ ...c, content: event.target.value }))}
          required
        />
        <div className="flex items-end gap-3">
          <input
            className="input w-24"
            type="number"
            placeholder="order"
            value={form.sortOrder}
            onChange={(event) => setForm((c) => ({ ...c, sortOrder: Number(event.target.value) }))}
          />
          <button type="submit" className="btn-primary" disabled={isSaving}>
            Save block
          </button>
        </div>
      </form>

      {isLoading ? (
        <Spinner label="Loading content…" />
      ) : (
        <ul className="surface-card divide-y divide-line">
          {blocks.length === 0 ? (
            <li className="px-5 py-4 text-sm text-ink-4">No blocks yet.</li>
          ) : (
            blocks.map((block) => (
              <li
                key={block.id}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink">
                    {block.sort_order}. {block.title}
                  </p>
                  <p className="line-clamp-2 text-xs text-ink-3">{block.content}</p>
                  <p className="mt-1 font-mono text-[11px] text-ink-4">{block.key}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() =>
                      setForm({
                        key: block.key,
                        title: block.title,
                        content: block.content,
                        sortOrder: block.sort_order,
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
                      if (!window.confirm(`Delete "${block.title}"?`)) return
                      setIsSaving(true)
                      void adminApi
                        .deleteCommunityInfo(block.key)
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
