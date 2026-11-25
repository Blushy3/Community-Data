/**
 * Runtime environment configuration.
 *
 * Only public values belong here. Secret keys (service_role / sb_secret_*)
 * must never be referenced by frontend code.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase configuration. Copy .env.example to .env.local and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
  )
}

export const env = {
  supabaseUrl,
  supabasePublishableKey,
  /** Optional fallback invite link; the canonical value lives in site_settings. */
  discordInviteUrl: import.meta.env.VITE_DISCORD_INVITE_URL ?? '',
} as const
