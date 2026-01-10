import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { api } from '../lib/api'
import { clearSession, decodeJwt, loadSession, persistSession } from '../lib/token'

const AuthContext = createContext({
  token: null,
  user: null,
  loading: true,
  error: '',
  signIn: async () => {},
  signOut: () => {}
})

const ADMIN_ROLE = 'admin'
const FALLBACK_EMAIL = 'admin@tarel.local'
const FALLBACK_PASSWORD = 'admin123'
const AUTO_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? FALLBACK_EMAIL).trim() || FALLBACK_EMAIL
const AUTO_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD ?? FALLBACK_PASSWORD) || FALLBACK_PASSWORD
const AUTO_SIGN_IN_ENABLED = AUTO_EMAIL !== '' && AUTO_PASSWORD !== ''
const SKIP_AUTO_KEY = 'tarel_admin_skip_auto'

function getWindow() {
  return typeof window === 'undefined' ? null : window
}

function shouldSkipAutoSignIn() {
  const win = getWindow()
  if (!win) return false
  try {
    return win.sessionStorage.getItem(SKIP_AUTO_KEY) === '1'
  } catch {
    return false
  }
}

function setSkipAutoSignIn(value) {
  const win = getWindow()
  if (!win) return
  try {
    if (value) {
      win.sessionStorage.setItem(SKIP_AUTO_KEY, '1')
    } else {
      win.sessionStorage.removeItem(SKIP_AUTO_KEY)
    }
  } catch (err) {
    console.error('Failed to update skip-auto flag', err)
  }
}

function isExpired(token) {
  const payload = decodeJwt(token)
  if (!payload?.exp) return false
  const nowSeconds = Date.now() / 1000
  return payload.exp < nowSeconds
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const signOut = () => {
    setSkipAutoSignIn(true)
    clearSession()
    setToken(null)
    setUser(null)
    setError('')
  }

  const signIn = useCallback(
    async ({ email, password }) => {
      setError('')
      const body = new URLSearchParams({ username: email.trim(), password })

      try {
        const response = await api('/auth/login', {
          method: 'POST',
          body
        })

        if (!response?.access_token) {
          throw new Error('Authentication failed')
        }

        if (response.user?.role !== ADMIN_ROLE) {
          throw new Error('Admins only. Contact support for access.')
        }

    persistSession(response.access_token, response.user)
    setSkipAutoSignIn(false)
        setToken(response.access_token)
        setUser(response.user)
        return response
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to sign in'
        setError(message)
        throw err
      }
    },
    []
  )

  useEffect(() => {
    let cancelled = false

    const initialise = async () => {
      const { token: storedToken, user: storedUser } = loadSession()

      if (storedToken && storedUser && !isExpired(storedToken)) {
        if (!cancelled) {
          setToken(storedToken)
          setUser(storedUser)
          setLoading(false)
        }
        return
      }

      clearSession()

      if (shouldSkipAutoSignIn()) {
        if (!cancelled) {
          setLoading(false)
        }
        return
      }

      if (!AUTO_SIGN_IN_ENABLED) {
        if (!cancelled) {
          setLoading(false)
        }
        return
      }

      if (!cancelled) {
        setLoading(true)
        setError('')
      }

      try {
        await signIn({ email: AUTO_EMAIL, password: AUTO_PASSWORD })
      } catch (err) {
        if (!cancelled) {
          console.error('Automatic admin sign-in failed', err)
          setError('Automatic admin sign-in failed. Check VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void initialise()

    return () => {
      cancelled = true
    }
  }, [signIn])

  const value = useMemo(
    () => ({ token, user, loading, error, signIn, signOut }),
    [token, user, loading, error, signIn]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
