import { useEffect, useState } from 'react'

import { Alert, Spinner, Stat } from '@/components/ui/Bits'
import { adminApi, describeError } from '@/lib/api'
import type { AdminStats } from '@/lib/api'
import { formatBytes } from '@/utils/format'

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [storage, setStorage] = useState<{ bucket: string; objects: number; bytes: number }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    Promise.all([adminApi.stats(), adminApi.storageUsage()])
      .then(([nextStats, nextStorage]) => {
        if (!active) return
        setStats(nextStats)
        setStorage(nextStorage)
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

  if (isLoading) return <Spinner label="Loading dashboard…" />
  if (error) return <Alert tone="error">{error}</Alert>
  if (!stats) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-3">Values are read from the database.</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Total users" value={stats.total_users} />
        <Stat label="Active users" value={stats.active_users} />
        <Stat label="Suspended users" value={stats.suspended_users} />
        <Stat label="Achievements" value={stats.achievements} />
        <Stat label="Awards granted" value={stats.awards} />
        <Stat label="Published updates" value={stats.published_updates} />
        <Stat label="Drafts" value={stats.draft_updates} />
        <Stat label="Explore sections" value={stats.explore_sections} />
        <Stat
          label="Registration"
          value={stats.registration_enabled ? 'Enabled' : 'Disabled'}
        />
      </dl>

      <section className="surface-card px-5 py-5">
        <h2 className="text-sm font-medium text-ink">Storage usage</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-4">
              <th className="py-1 font-normal">Bucket</th>
              <th className="py-1 font-normal">Objects</th>
              <th className="py-1 font-normal">Size</th>
            </tr>
          </thead>
          <tbody>
            {storage.map((row) => (
              <tr key={row.bucket} className="border-t border-line">
                <td className="py-2 text-ink-2">{row.bucket}</td>
                <td className="py-2 tabular-nums text-ink-2">{row.objects}</td>
                <td className="py-2 tabular-nums text-ink-2">{formatBytes(row.bytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
