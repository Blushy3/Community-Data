import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Alert, Spinner } from '@/components/ui/Bits'
import { EmptyState, PageHeader } from '@/components/ui/PageHeader'
import { contentApi, describeError } from '@/lib/api'
import type { ExploreSection } from '@/types'

export function ExplorePage() {
  const [sections, setSections] = useState<ExploreSection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    contentApi
      .exploreSections()
      .then((rows) => {
        if (active) setSections(rows)
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
        eyebrow="Sections"
        title="Explore"
        description="Thematic areas of the community - games, projects and the archive."
      />

      <div className="page-container py-8">
        {error ? <Alert tone="error">{error}</Alert> : null}

        {isLoading ? (
          <Spinner label="Loading sections…" />
        ) : sections.length === 0 ? (
          <EmptyState
            title="No published sections yet"
            description="Administrators can create, order, publish and unpublish thematic sections."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <li key={section.id}>
                <Link
                  to={`/explore/${section.slug}`}
                  className="surface-card flex h-full flex-col gap-1.5 px-4 py-4 transition-colors duration-150 hover:border-line-strong hover:bg-surface-2"
                >
                  <span className="text-sm font-medium text-ink">{section.title}</span>
                  <span className="text-sm text-ink-3">{section.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
