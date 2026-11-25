import { useEffect, useState } from 'react'

import { Alert, Spinner } from '@/components/ui/Bits'
import { adminApi, contentApi, describeError } from '@/lib/api'

export function AdminRegistrationPage() {
  const [registrationEnabled, setRegistrationEnabled] = useState(false)
  const [discordUrl, setDiscordUrl] = useState('')
  const [invitationCode, setInvitationCode] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    contentApi
      .settings()
      .then((settings) => {
        if (!active) return
        setRegistrationEnabled(settings.registration_enabled)
        setDiscordUrl(settings.discord_invite_url ?? '')
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

  const withSaving = async (action: () => Promise<void>) => {
    setIsSaving(true)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (saveError) {
      setError(describeError(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <Spinner label="Loading settings…" />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl">Registration</h1>
        <p className="mt-1 text-sm text-ink-3">
          Codes are stored only in a protected form. The original value can never be read
          back, not even by an administrator.
        </p>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <section className="surface-card space-y-4 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">New registrations</p>
            <p className="text-xs text-ink-3">
              Currently {registrationEnabled ? 'enabled' : 'disabled'}.
            </p>
          </div>
          <button
            type="button"
            className={registrationEnabled ? 'btn-danger' : 'btn-primary'}
            disabled={isSaving}
            onClick={() =>
              void withSaving(async () => {
                await adminApi.setRegistration(!registrationEnabled, null)
                setRegistrationEnabled(!registrationEnabled)
                setNotice('Registration settings saved.')
              })
            }
          >
            {registrationEnabled ? 'Disable registration' : 'Enable registration'}
          </button>
        </div>

        <hr />

        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (invitationCode.trim().length < 6) {
              setError('The invitation code must be at least 6 characters.')
              return
            }
            if (
              !window.confirm('Changing the code invalidates the previous one immediately. Continue?')
            ) {
              return
            }
            void withSaving(async () => {
              await adminApi.setRegistration(registrationEnabled, invitationCode.trim())
              setInvitationCode('')
              setNotice('Invitation code changed. The old code no longer works.')
            })
          }}
        >
          <label className="label" htmlFor="new-code">
            Set a new shared invitation code
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="new-code"
              className="input sm:max-w-sm"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="At least 6 characters"
              value={invitationCode}
              onChange={(event) => setInvitationCode(event.target.value)}
            />
            <button type="submit" className="btn-secondary" disabled={isSaving}>
              Save new code
            </button>
          </div>
        </form>
      </section>

      <section className="surface-card space-y-3 px-5 py-5">
        <p className="text-sm font-medium text-ink">Discord invite link</p>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            void withSaving(async () => {
              await adminApi.setDiscordUrl(discordUrl)
              setNotice('Discord invite link saved.')
            })
          }}
        >
          <input
            className="input sm:max-w-md"
            type="url"
            placeholder="https://discord.gg/…"
            value={discordUrl}
            onChange={(event) => setDiscordUrl(event.target.value)}
          />
          <button type="submit" className="btn-secondary" disabled={isSaving}>
            Save link
          </button>
        </form>
      </section>

      <section className="surface-card px-5 py-5">
        <p className="text-sm font-medium text-ink">Roles</p>
        <p className="mt-1 text-xs text-ink-3">
          member - own profile only. moderator - reserved for explicitly defined duties. admin -
          full management. Every backend function re-checks the role in the database.
        </p>
      </section>
    </div>
  )
}
