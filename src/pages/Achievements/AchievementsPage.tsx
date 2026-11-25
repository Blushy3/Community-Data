import { useEffect, useState } from 'react'

import { Alert, Spinner } from '@/components/ui/Bits'
import { EmptyState, PageHeader } from '@/components/ui/PageHeader'
import { contentApi, describeError } from '@/lib/api'
import type { Achievement } from '@/types'
import { formatDate } from '@/utils/format'

export function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    contentApi
      .achievements()
      .then((rows) => {
        if (active) setAchievements(rows)
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
        eyebrow="Recognition"
        title="Achievements"
        description="Badges awarded by the community administration. Only administrators can grant them."
      />

      <div className="page-container py-8">
        {error ? <Alert tone="error">{error}</Alert> : null}

        {isLoading ? (
          <Spinner label="Loading achievements…" />
        ) : achievements.length === 0 ? (
          <EmptyState
            title="No achievements have been created yet"
            description="Administrators define achievements (name, identifier, description) and assign them to members."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((achievement) => (
              <li key={achievement.id} className="surface-card px-4 py-4">
                <p className="text-sm font-medium text-ink">{achievement.name}</p>
                <p className="mt-1 text-sm text-ink-3">{achievement.description}</p>
                <p className="mt-2 font-mono text-[11px] text-ink-4">{achievement.slug}</p>
                <p className="mt-1 text-xs text-ink-4">
                  Created {formatDate(achievement.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
