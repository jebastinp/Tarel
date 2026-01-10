'use client'

import { useEffect, useState } from 'react'

import AdminGuard from '@/components/AdminGuard'
import { getToken } from '@/lib/auth'
import { buildApiUrl } from '@/lib/api'

interface UserRow {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  created_at: string
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const token = getToken()

  const load = async () => {
    if (!token) return
    const res = await fetch(buildApiUrl('/admin/users'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setUsers(await res.json())
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const updateRole = async (id: string, role: 'user' | 'admin') => {
    if (!token) return
    await fetch(buildApiUrl(`/admin/users/${id}/role?role=${role}`), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    load()
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-semibold text-brand-dark">Manage users</h1>
          <p className="text-sm text-brand-dark/60">Promote customers to admins or audit sign-ups.</p>
        </header>
        {loading ? (
          <p className="text-sm text-brand-dark/60">Loading users…</p>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-brand-dark/10 bg-white p-4 shadow-sm">
                <div>
                  <p className="font-semibold text-brand-dark">{user.name}</p>
                  <p className="text-sm text-brand-dark/70">{user.email}</p>
                  <p className="text-xs text-brand-dark/50">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-brand-olive/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-dark">
                    {user.role}
                  </span>
                  {user.role !== 'admin' ? (
                    <button className="btn" onClick={() => updateRole(user.id, 'admin')}>
                      Promote to admin
                    </button>
                  ) : (
                    <button
                      className="rounded-full border border-brand-dark/20 px-4 py-2 text-sm text-brand-dark hover:border-brand-dark"
                      onClick={() => updateRole(user.id, 'user')}
                    >
                      Demote to user
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminGuard>
  )
}
