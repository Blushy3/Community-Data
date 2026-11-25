import { useEffect, useState } from 'react'

import { Alert, Spinner } from '@/components/ui/Bits'
import { EmptyState, PageHeader } from '@/components/ui/PageHeader'
import { contentApi, describeError } from '@/lib/api'
import type { CommunityInfoEntry } from '@/types'

export function CommunityPage() {
  const [blocks, setBlocks] = useState<CommunityInfoEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    contentApi
      .communityInfo()
      .then((rows) => {
        if (active) setBlocks(rows)
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
        eyebrow="About us"
        title="Community"
        description="Introduction, rules, history and administration information."
      />

      <div className="page-container py-8">
        {error ? <Alert tone="error">{error}</Alert> : null}

        {isLoading ? (
          <Spinner label="Loading community information…" />
        ) : blocks.length === 0 ? (
          <EmptyState
            title="No community information published yet"
            description="Administrators can add sections such as introduction, rules, history and administration details."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {blocks.map((block) => (
              <article key={block.id} className="surface-card px-5 py-5">
                <h2 className="text-base">{block.title}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">{block.content}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
