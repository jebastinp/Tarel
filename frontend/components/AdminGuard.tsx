'use client'

import { useEffect, useState } from 'react'

import { getToken } from '@/lib/auth'

function parseJwt(token: string) {
  const base64Url = token.split('.')[1]
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      })
      .join(''),
  )
  return JSON.parse(jsonPayload)
}

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    const token = getToken()
    if (!token) {
      return
    }
    try {
      const { role } = parseJwt(token)
      setOk(role === 'admin')
    } catch {
      setOk(false)
    }
  }, [])
  if (!ok) {
    return <div>Admins only.</div>
  }
  return <>{children}</>
}
