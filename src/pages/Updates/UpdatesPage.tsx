import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Alert, Spinner } from '@/components/ui/Bits'
import { EmptyState, PageHeader } from '@/components/ui/PageHeader'
import { contentApi, describeError } from '@/lib/api'
import type { CommunityUpdate } from '@/types'
import { formatDate } from '@/utils/format'

type UpdateTeaser = Pick<CommunityUpdate, 'id' | 'title' | 'slug' | 'description' | 'published_at'>

export function UpdatesPage() {
  const [updates, setUpdates] = useState<UpdateTeaser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    contentApi
      .publishedUpdates(50)
      .then((rows) => {
        if (active) setUpdates(rows)
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
      <PageHeader
        eyebrow="News"
        title="Updates"
        description="Official announcements from the community administration."
      />

      <div className="page-container py-8">
        {error ? <Alert tone="error">{error}</Alert> : null}

        {isLoading ? (
          <Spinner label="Loading updates…" />
        ) : updates.length === 0 ? (
          <EmptyState
            title="No published updates yet"
            description="Updates are written and published by administrators. Drafts never appear on the public site."
          />
        ) : (
          <ul className="space-y-3">
            {updates.map((update) => (
              <li key={update.id}>
                <Link
                  to={`/updates/${update.slug}`}
                  className="surface-card block px-5 py-4 transition-colors duration-150 hover:border-line-strong hover:bg-surface-2"
                >
                  <p className="text-sm font-medium text-ink">{update.title}</p>
                  <p className="mt-1 text-sm text-ink-3">{update.description}</p>
                  <p className="mt-2 text-xs text-ink-4">
                    {formatDate(update.published_at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
