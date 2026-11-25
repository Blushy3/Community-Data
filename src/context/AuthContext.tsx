import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'

import { profilesApi } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'
import type { Profile, Role } from '@/types'

interface AuthContextValue {
  status: 'loading' | 'signed-out' | 'signed-in'
  session: Session | null
  profile: Profile | null
  roles: Role[]
  isAdmin: boolean
  isModerator: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<Role[]>([])

  const loadProfile = useCallback(async (nextSession: Session | null) => {
    if (!nextSession) {
      setProfile(null)
      setRoles([])
      setStatus('signed-out')
      return
    }

    const [nextProfile, nextRoles] = await Promise.all([
      profilesApi.getById(nextSession.user.id),
      profilesApi.getRoles(nextSession.user.id),
    ])

    // A suspended account must not keep an authenticated session (README §6).
    if (nextProfile && nextProfile.account_status !== 'active') {
      await supabase.auth.signOut()
      setProfile(null)
      setRoles([])
      setStatus('signed-out')
      return
    }

    setProfile(nextProfile)
    setRoles(nextRoles)
    setStatus('signed-in')
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      await loadProfile(nextSession)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [loadProfile])

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    await loadProfile(data.session)
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setRoles([])
    setStatus('signed-out')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      profile,
      roles,
      isAdmin: roles.includes('admin'),
      isModerator: roles.includes('moderator') || roles.includes('admin'),
      refresh,
      signOut,
    }),
    [status, session, profile, roles, refresh, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
