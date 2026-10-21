import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { DEMO_PASSWORD } from '../lib/constants'
import {
  currentProfile,
  getSnapshot,
  login as demoLogin,
  logout as demoLogout,
  subscribe,
} from '../demo/store'
import type { Profile } from '../types'

interface AuthValue {
  profile: Profile | null
  loading: boolean
  demoMode: boolean
  login: (email: string, password: string) => { ok: boolean; error?: string }
  logout: () => void
  demoPassword: string
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const profile = snapshot.sessionProfileId ? currentProfile() : null
  const value = useMemo<AuthValue>(
    () => ({
      profile,
      loading: false,
      demoMode: true,
      login: demoLogin,
      logout: demoLogout,
      demoPassword: DEMO_PASSWORD,
    }),
    [profile],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
