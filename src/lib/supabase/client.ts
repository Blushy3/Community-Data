import { createClient } from '@supabase/supabase-js'

import { env } from '@/lib/env'

/**
 * Single Supabase browser client for the whole application.
 *
 * - Uses the public publishable/anon key only (access is governed by RLS).
 * - Sessions are persisted in localStorage and refreshed automatically.
 * - `detectSessionInUrl` is disabled: the project has no OAuth or email links.
 */
export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
})
