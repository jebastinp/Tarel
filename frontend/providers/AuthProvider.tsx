'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { clearSession, getStoredUser, getToken, saveSession, type SessionUser } from '@/lib/auth'
import { buildApiUrl } from '@/lib/api'

type AuthContextValue = {
  user: SessionUser | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => void
  setSession: (token: string, user: SessionUser) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const syncUser = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
      const res = await fetch(buildApiUrl('/auth/me'), {
        headers,
        cache: 'no-store',
      })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      const profile = (await res.json()) as SessionUser
      saveSession(token, profile)
      setUser(profile)
    } catch (error) {
      console.warn('Failed to refresh user profile', error)
      clearSession()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const storedUser = getStoredUser()
    if (storedUser) {
      setUser(storedUser)
    }

    const token = getToken()
    if (token) {
      syncUser()
    } else {
      setLoading(false)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'token' || event.key === 'user') {
        syncUser()
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [syncUser])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }, [])

  const setSession = useCallback((token: string, sessionUser: SessionUser) => {
    saveSession(token, sessionUser)
    setUser(sessionUser)
    setLoading(false)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refresh: syncUser,
      logout,
      setSession,
    }),
    [user, loading, syncUser, logout, setSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
