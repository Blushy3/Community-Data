import type { ReactNode } from 'react'

import type { Role } from '@/types'
import { initials } from '@/utils/format'
import { publicImageUrl } from '@/utils/storage'

export function Avatar({
  path,
  name,
  size = 'md',
}: {
  path: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const url = publicImageUrl('avatars', path)
  const dimensions =
    size === 'lg' ? 'size-24 text-2xl' : size === 'sm' ? 'size-9 text-[11px]' : 'size-12 text-sm'

  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        className={`${dimensions} shrink-0 rounded-full border border-line object-cover transition-[border-color,transform] duration-200`}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`${dimensions} flex shrink-0 items-center justify-center rounded-full border border-line bg-surface-3 font-medium text-ink-2 transition-colors duration-200`}
    >
      {initials(name) || '?'}
    </span>
  )
}

const ROLE_LABELS: Record<Role, string> = {
  member: 'Member',
  moderator: 'Moderator',
  admin: 'Admin',
}

export function RoleBadge({ role }: { role: Role }) {
  const tone =
    role === 'admin'
      ? 'border-ink-4 text-ink'
      : role === 'moderator'
        ? 'border-line-strong text-ink-2'
        : 'border-line text-ink-3'

  return <span className={`badge ${tone}`}>{ROLE_LABELS[role]}</span>
}

export function Alert({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'error' | 'warning'
  children: ReactNode
}) {
  const tones = {
    info: 'border-line bg-surface-2 text-ink-2',
    success: 'border-success/40 bg-success/10 text-success',
    error: 'border-danger/40 bg-danger/10 text-danger',
    warning: 'border-warning/40 bg-warning/10 text-warning',
  } as const

  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-xs ${tones[tone]}`}>
      {children}
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-ink-4" role="status">
      <span className="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-transparent" />
      {label ?? 'Loading…'}
    </div>
  )
}

/** Neutral placeholder block: keeps layout stable while data arrives. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />
}

export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  if (pageCount <= 1) return null

  return (
    <div className="mt-6 flex items-center justify-between gap-3 text-sm">
      <button
        type="button"
        className="btn-secondary"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        Previous
      </button>
      <span className="text-xs text-ink-4">
        Page {page} of {pageCount}
      </span>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
      >
        Next
      </button>
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="surface-card px-4 py-4">
      <p className="text-xs text-ink-4">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
    </div>
  )
}
