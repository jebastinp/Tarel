const RAW_API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api'
const API_BASE = RAW_API_BASE.replace(/\/+$/, '')

function joinUrl(base, path) {
  const safePath = path.startsWith('/') ? path : `/${path}`
  return `${base}${safePath}`
}

function buildHeaders(token, extraHeaders = {}) {
  const headers = { ...extraHeaders }
  if (!(headers instanceof Headers)) {
    headers['Accept'] = headers['Accept'] || 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export async function api(path, { method = 'GET', body, token, headers = {} } = {}) {
  const init = {
    method,
    headers: buildHeaders(token, headers)
  }

  if (body instanceof FormData) {
    init.body = body
  } else if (body instanceof URLSearchParams) {
    init.body = body
    init.headers['Content-Type'] = 'application/x-www-form-urlencoded'
  } else if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(joinUrl(API_BASE, path), init)

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || response.statusText)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export function getApiBase() {
  return API_BASE
}
