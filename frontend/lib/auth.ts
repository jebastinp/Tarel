const TOKEN_KEY = 'token'
const USER_KEY = 'user'

export type SessionUser = {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  created_at?: string
  phone?: string | null
  address_line1?: string | null
  locality?: string | null
  city?: string | null
  postcode?: string | null
  user_code?: string | null
}

export function saveSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function saveToken(token: string, user?: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token)
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

export function getToken() {
  return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionUser
  } catch (error) {
    console.warn('Failed to parse stored user', error)
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function clearToken() {
  clearSession()
}

export function authHeader(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
