'use client'

import { FormEvent, useEffect, useState } from 'react'

import AdminGuard from '@/components/AdminGuard'
import { getToken } from '@/lib/auth'
import { buildApiUrl } from '@/lib/api'

interface Category {
  id: string
  name: string
  slug: string
  is_active: boolean
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const token = getToken()

  const load = async () => {
    if (!token) return
    const res = await fetch(buildApiUrl('/admin/categories'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setCategories(await res.json())
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    setError('')
    const params = new URLSearchParams({ name, slug })
    const res = await fetch(buildApiUrl(`/admin/categories?${params.toString()}`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      setError(await res.text())
      return
    }
    setName('')
    setSlug('')
    load()
  }

  const remove = async (id: string) => {
    if (!token) return
    await fetch(buildApiUrl(`/admin/categories/${id}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    load()
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-semibold text-brand-dark">Manage categories</h1>
          <p className="text-sm text-brand-dark/60">Organise storefront browsing experiences.</p>
        </header>
        <form onSubmit={create} className="grid gap-4 rounded-3xl bg-white p-6 shadow md:grid-cols-[2fr_2fr_auto]">
          <div>
            <label className="text-sm font-medium text-brand-dark">Name</label>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-brand-dark/10 px-4 py-3 text-sm outline-none focus:border-brand-dark/40 focus:ring-2 focus:ring-brand-olive/30"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-dark">Slug</label>
            <input
              required
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-brand-dark/10 px-4 py-3 text-sm outline-none focus:border-brand-dark/40 focus:ring-2 focus:ring-brand-olive/30"
            />
          </div>
          <button type="submit" className="btn self-end">
            Add category
          </button>
          {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
        </form>

        <div className="grid gap-3 md:grid-cols-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between rounded-3xl border border-brand-dark/10 bg-white p-4 shadow-sm">
              <div>
                <p className="font-semibold text-brand-dark">{category.name}</p>
                <p className="text-xs text-brand-dark/60">/{category.slug}</p>
              </div>
              <button
                className="rounded-full border border-brand-dark/20 px-4 py-2 text-sm text-brand-dark hover:border-brand-dark"
                onClick={() => remove(category.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </AdminGuard>
  )
}
