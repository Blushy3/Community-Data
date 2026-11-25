import { useEffect, useState } from 'react'

import { Alert, Spinner } from '@/components/ui/Bits'
import { adminApi, describeError } from '@/lib/api'
import { formatBytes, formatDateTime } from '@/utils/format'

export function AdminStoragePage() {
  const [rows, setRows] = useState<{ bucket: string; objects: number; bytes: number }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    adminApi
      .storageUsage()
      .then((next) => {
        if (active) setRows(next)
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

  if (isLoading) return <Spinner label="Loading storage usage…" />
  if (error) return <Alert tone="error">{error}</Alert>

  const total = rows.reduce((sum, row) => sum + Number(row.bytes), 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl">Storage</h1>
        <p className="mt-1 text-sm text-ink-3">
          Profile images only - one avatar and one banner per member, replaced files are deleted.
        </p>
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-4">
              <th className="px-4 py-3 font-normal">Bucket</th>
              <th className="px-4 py-3 font-normal">Objects</th>
              <th className="px-4 py-3 font-normal">Size</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.bucket} className="border-b border-line last:border-0">
                <td className="px-4 py-3 text-ink-2">{row.bucket}</td>
                <td className="px-4 py-3 tabular-nums text-ink-2">{row.objects}</td>
                <td className="px-4 py-3 tabular-nums text-ink-2">{formatBytes(row.bytes)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="px-4 py-3 text-xs text-ink-4">Total</td>
              <td />
              <td className="px-4 py-3 tabular-nums text-ink">{formatBytes(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export function AdminAuditLogPage() {
  const [entries, setEntries] = useState<
    { id: string; action: string; admin_id: string | null; target_user_id: string | null; details: unknown; created_at: string }[]
  >([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    adminApi
      .auditLog(200)
      .then((rows) => {
        if (active) setEntries(rows as typeof entries)
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

  if (isLoading) return <Spinner label="Loading audit log…" />
  if (error) return <Alert tone="error">{error}</Alert>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl">Audit log</h1>
        <p className="mt-1 text-sm text-ink-3">
          Append-only record written by backend operations. No client can modify it.
        </p>
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-4">
              <th className="px-4 py-3 font-normal">When</th>
              <th className="px-4 py-3 font-normal">Action</th>
              <th className="px-4 py-3 font-normal">Target</th>
              <th className="px-4 py-3 font-normal">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-line transition-colors duration-150 last:border-0 hover:bg-surface-2/60"
              >
                <td className="px-4 py-3 text-xs text-ink-3">
                  {formatDateTime(entry.created_at)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-2">{entry.action}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-ink-4">
                  {entry.target_user_id?.slice(0, 8) ?? '-'}
                </td>
                <td className="px-4 py-3 text-[11px] text-ink-4">
                  {JSON.stringify(entry.details)}
                </td>
              </tr>
            ))}
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-ink-4">
                  No entries yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
