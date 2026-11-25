import { useEffect, useState } from 'react'

import { Alert, Spinner } from '@/components/ui/Bits'
import { PageHeader } from '@/components/ui/PageHeader'
import { contentApi, describeError } from '@/lib/api'
import { env } from '@/lib/env'

/**
 * Discord navigation target (README §4.8). The invite URL lives in site_settings
 * so it can be changed without touching the code; the env value is only a
 * local fallback.
 */
export function DiscordPage() {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    contentApi
      .settings()
      .then((settings) => {
        if (!active) return
        setInviteUrl(settings.discord_invite_url ?? env.discordInviteUrl)
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
        eyebrow="Live"
        title="Discord"
        description="Discord is our primary platform for conversation and real-time interaction."
      />

      <div className="page-container py-8">
        <div className="surface-card max-w-2xl px-5 py-6">
          <p className="text-sm text-ink-2">
            This portal documents the community. Everything live - chat, events, voice and
            announcements in the moment - happens on our Discord server.
          </p>

          {error ? (
            <div className="mt-4">
              <Alert tone="error">{error}</Alert>
            </div>
          ) : null}

          <div className="mt-5">
            {isLoading ? (
              <Spinner label="Loading invite link…" />
            ) : inviteUrl ? (
              <a
                href={inviteUrl}
                className="btn-primary"
                target="_blank"
                rel="noreferrer noopener"
              >
                Open the Discord server
              </a>
            ) : (
              <p className="rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink-3">
                The invitation link has not been configured yet. An administrator can set it in
                the admin panel.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
