import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="border-b border-line">
      <div className="page-container flex flex-col gap-4 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
          <h1 className="mt-2 text-3xl">{title}</h1>
          {description ? <p className="mt-2 text-sm text-ink-3">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description: string
  children?: ReactNode
}

/**
 * Neutral "nothing here yet" state. Never filled with invented data (README §11).
 */
export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="surface-card flex flex-col items-start gap-2 px-5 py-8">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="max-w-xl text-sm text-ink-3">{description}</p>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  )
}
