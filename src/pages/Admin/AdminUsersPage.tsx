import { useCallback, useEffect, useState } from 'react'

import { Alert, Spinner } from '@/components/ui/Bits'
import { useAuth } from '@/context/AuthContext'
import { adminApi, describeError } from '@/lib/api'
import type { AdminUserRow } from '@/lib/api'
import type { Role } from '@/types'
import { formatDate } from '@/utils/format'

const ROLES: Role[] = ['member', 'moderator', 'admin']

export function AdminUsersPage() {
  const { profile: me } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setRows(await adminApi.users(search))
    } catch (loadError) {
      setError(describeError(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => {
    void load()
  }, [load])

  const runAction = async (userId: string, action: () => Promise<void>, message: string) => {
    setBusyId(userId)
    setError(null)
    setNotice(null)
    try {
      await action()
      setNotice(message)
      await load()
    } catch (actionError) {
      setError(describeError(actionError))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl">Users</h1>
        <p className="mt-1 text-sm text-ink-3">
          Role changes and suspensions are enforced by the backend and logged.
        </p>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(searchInput)
        }}
      >
        <input
          className="input sm:max-w-sm"
          type="search"
          placeholder="Search by username or display name"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>

      {isLoading ? (
        <Spinner label="Loading users…" />
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-4">
                <th className="px-4 py-3 font-normal">User</th>
                <th className="px-4 py-3 font-normal">Joined</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">Role</th>
                <th className="px-4 py-3 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const currentRole = row.user_roles[0]?.role ?? 'member'
                const isSelf = row.id === me?.id
                const isBusy = busyId === row.id

                return (
                  <tr
                    key={row.id}
                    className="border-b border-line transition-colors duration-150 last:border-0 hover:bg-surface-2/60"
                  >
                    <td className="px-4 py-3">
                      <p className="text-ink">{row.display_name}</p>
                      <p className="text-xs text-ink-4">@{row.username}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-3">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.account_status === 'active'
                            ? 'badge border-success/40 text-success'
                            : 'badge border-danger/40 text-danger'
                        }
                      >
                        {row.account_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="input py-1"
                        value={currentRole}
                        disabled={isSelf || isBusy}
                        onChange={(event) =>
                          void runAction(
                            row.id,
                            () => adminApi.setRole(row.id, event.target.value as Role),
                            `Role updated for @${row.username}.`,
                          )
                        }
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className={
                          row.account_status === 'active' ? 'btn-danger' : 'btn-secondary'
                        }
                        disabled={isSelf || isBusy}
                        onClick={() => {
                          const next = row.account_status === 'active' ? 'suspended' : 'active'
                          if (next === 'suspended' && !window.confirm(`Suspend @${row.username}?`)) {
                            return
                          }
                          void runAction(
                            row.id,
                            () => adminApi.setStatus(row.id, next),
                            next === 'suspended'
                              ? `@${row.username} suspended.`
                              : `@${row.username} restored.`,
                          )
                        }}
                      >
                        {row.account_status === 'active' ? 'Suspend' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-ink-4">
                    No users match this search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
