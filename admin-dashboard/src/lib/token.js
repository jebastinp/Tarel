const TOKEN_KEY = 'tarel_admin_token'
const USER_KEY = 'tarel_admin_user'

function safeWindow() {
  return typeof window === 'undefined' ? null : window
}

export function decodeJwt(token) {
  try {
    const [, payload] = token.split('.')
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(json)
  } catch (err) {
    console.error('Failed to decode JWT', err)
    return null
  }
}

export function loadSession() {
  const win = safeWindow()
  if (!win) return { token: null, user: null }
  try {
    const token = win.sessionStorage.getItem(TOKEN_KEY)
    const userRaw = win.sessionStorage.getItem(USER_KEY)
    const user = userRaw ? JSON.parse(userRaw) : null
    return { token, user }
  } catch {
    return { token: null, user: null }
  }
}

export function persistSession(token, user) {
  const win = safeWindow()
  if (!win) return
  try {
    win.sessionStorage.setItem(TOKEN_KEY, token)
    win.sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch (err) {
    console.error('Failed to persist admin session', err)
  }
}

export function clearSession() {
  const win = safeWindow()
  if (!win) return
  win.sessionStorage.removeItem(TOKEN_KEY)
  win.sessionStorage.removeItem(USER_KEY)
}
