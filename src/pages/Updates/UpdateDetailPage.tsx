import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Alert, Spinner } from '@/components/ui/Bits'
import { EmptyState } from '@/components/ui/PageHeader'
import { contentApi, describeError } from '@/lib/api'
import type { CommunityUpdate } from '@/types'
import { formatDate } from '@/utils/format'

type UpdateDetail = Pick<
  CommunityUpdate,
  'id' | 'title' | 'slug' | 'description' | 'content' | 'published_at'
>

export function UpdateDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [update, setUpdate] = useState<UpdateDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)

    contentApi
      .updateBySlug(slug)
      .then((row) => {
        if (active) setUpdate(row)
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
  }, [slug])

  if (isLoading) {
    return (
      <div className="page-container py-16">
        <Spinner label="Loading update…" />
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

  if (!update) {
    return (
      <div className="page-container py-16">
        <EmptyState
          title="Update not found"
          description="This announcement does not exist or is still a draft."
        >
          <Link to="/updates" className="btn-secondary">
            Back to updates
          </Link>
        </EmptyState>
      </div>
    )
  }

  return (
    <div>
      <div className="border-b border-line">
        <div className="page-container py-10">
          <p className="section-eyebrow">Official update</p>
          <h1 className="mt-2 max-w-3xl text-3xl">{update.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-3">{update.description}</p>
          <p className="mt-3 text-xs text-ink-4">Published {formatDate(update.published_at)}</p>
        </div>
      </div>

      <div className="page-container py-8">
        <article className="max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
          {update.content}
        </article>

        <p className="mt-8">
          <Link to="/updates" className="btn-secondary">
            ← All updates
          </Link>
        </p>
      </div>
    </div>
  )
}
