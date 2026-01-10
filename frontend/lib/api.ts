const RAW_ORIGIN = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000').replace(/\/+$/, '')

export const API_ORIGIN = RAW_ORIGIN.endsWith('/api') ? RAW_ORIGIN.replace(/\/api$/, '') : RAW_ORIGIN
export const API_BASE = `${API_ORIGIN}/api`

export function buildApiUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const normalisedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${normalisedPath}`
}

export function buildServiceUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const normalisedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_ORIGIN}${normalisedPath}`
}

export async function api(path: string, opts: RequestInit = {}) {
  const target = buildApiUrl(path)
  const res = await fetch(target, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  if (!res.ok) {
    throw new Error(await res.text())
  }
  return res.json()
}
