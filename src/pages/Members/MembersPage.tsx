import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Alert, Avatar, Pagination, Spinner } from '@/components/ui/Bits'
import { EmptyState, PageHeader } from '@/components/ui/PageHeader'
import { describeError, profilesApi } from '@/lib/api'
import type { MemberRow } from '@/lib/api'
import { formatDate } from '@/utils/format'

const PAGE_SIZE = 12

export function MembersPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<MemberRow[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)

    profilesApi
      .list(page, PAGE_SIZE, search)
      .then((result) => {
        if (!active) return
        setRows(result.rows)
        setTotal(result.total)
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
  }, [page, search])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <PageHeader
        eyebrow="Directory"
        title="Members"
        description="Registered community members. Search by username or display name."
      />

      <div className="page-container py-8">
        <form
          role="search"
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={(event) => {
            event.preventDefault()
            setPage(1)
            setSearch(searchInput)
          }}
        >
          <label className="sr-only" htmlFor="member-search">
            Search members
          </label>
          <input
            id="member-search"
            className="input sm:max-w-sm"
            type="search"
            placeholder="Search by username or display name"
            autoComplete="off"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <button type="submit" className="btn-secondary">
            Search
          </button>
          {search ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setSearchInput('')
                setSearch('')
                setPage(1)
              }}
            >
              Clear
            </button>
          ) : null}
        </form>

        <p className="mt-3 text-xs text-ink-4">
          {total} {total === 1 ? 'member' : 'members'}
          {search ? ` matching “${search}”` : ''}
        </p>

        {error ? (
          <div className="mt-4">
            <Alert tone="error">{error}</Alert>
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-6">
            <Spinner label="Loading members…" />
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title={search ? 'No members match this search' : 'No members yet'}
              description={
                search
                  ? 'Try a different username or display name.'
                  : 'Profiles are created automatically when someone registers with the invitation code.'
              }
            />
          </div>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((member) => (
              <li key={member.id}>
                <Link
                  to={`/members/${member.username}`}
                  className="surface-card flex h-full items-start gap-3 px-4 py-4 transition-colors duration-150 hover:border-line-strong hover:bg-surface-2"
                >
                  <Avatar path={member.avatar_path} name={member.display_name} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {member.display_name}
                    </span>
                    <span className="block truncate text-xs text-ink-4">@{member.username}</span>
                    <span className="mt-1 block text-xs text-ink-4">
                      Joined {formatDate(member.created_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Pagination page={page} pageCount={pageCount} onChange={setPage} />
      </div>
    </div>
  )
}
