import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Alert, Spinner } from '@/components/ui/Bits'
import { EmptyState } from '@/components/ui/PageHeader'
import { contentApi, describeError } from '@/lib/api'
import type { ExploreSection } from '@/types'

export function ExploreSectionPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [section, setSection] = useState<ExploreSection | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)

    contentApi
      .exploreSectionBySlug(slug)
      .then((row) => {
        if (active) setSection(row)
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
        <Spinner label="Loading section…" />
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

  if (!section) {
    return (
      <div className="page-container py-16">
        <EmptyState title="Section not found" description="This section is not published.">
          <Link to="/explore" className="btn-secondary">
            Back to Explore
          </Link>
        </EmptyState>
      </div>
    )
  }

  return (
    <div>
      <div className="border-b border-line">
        <div className="page-container py-10">
          <p className="section-eyebrow">Explore</p>
          <h1 className="mt-2 text-3xl">{section.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-3">{section.description}</p>
        </div>
      </div>

      <div className="page-container py-8">
        {section.content?.trim() ? (
          <article className="max-w-3xl whitespace-pre-wrap text-sm text-ink-2">
            {section.content}
          </article>
        ) : (
          <p className="text-sm text-ink-4">This section has no extended description yet.</p>
        )}

        <p className="mt-8">
          <Link to="/explore" className="btn-secondary">
            ← All sections
          </Link>
        </p>
      </div>
    </div>
  )
}
