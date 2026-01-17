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
        }
      } else {
        clearSession()
      }

      if (!cancelled) {
        setLoading(false)
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
