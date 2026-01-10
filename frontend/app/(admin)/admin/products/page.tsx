'use client'

import { FormEvent, useEffect, useState } from 'react'

import AdminGuard from '@/components/AdminGuard'
import { getToken } from '@/lib/auth'
import { buildApiUrl } from '@/lib/api'

interface AdminProduct {
  id: string
  name: string
  slug: string
  price: number
  stock: number
  is_active: boolean
}

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [price, setPrice] = useState('0')
  const [stock, setStock] = useState('0')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const token = getToken()

  const loadProducts = async () => {
    if (!token) return
    const res = await fetch(buildApiUrl('/admin/products'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setProducts(await res.json())
  }

  const loadCategories = async () => {
    if (!token) return
    const res = await fetch(buildApiUrl('/admin/categories'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setCategories(await res.json())
  }

  useEffect(() => {
    loadProducts()
    loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const update = async (id: string, updates: Record<string, string | number | boolean>) => {
    if (!token) return
    const params = new URLSearchParams()
    Object.entries(updates).forEach(([key, value]) => {
      params.set(key, String(value))
    })
    await fetch(buildApiUrl(`/admin/products/${id}?${params.toString()}`), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    loadProducts()
  }

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    const params = new URLSearchParams({
      name,
      slug,
      price,
      stock,
      category_id: categoryId,
    })
    await fetch(buildApiUrl(`/admin/products?${params.toString()}`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    setName('')
    setSlug('')
    setPrice('0')
    setStock('0')
    loadProducts()
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-semibold text-brand-dark">Manage products</h1>
          <p className="text-sm text-brand-dark/60">Adjust price, stock, or add new SKUs.</p>
        </header>

        <form onSubmit={create} className="grid gap-4 rounded-3xl bg-white p-6 shadow md:grid-cols-[2fr_2fr_1fr_1fr_auto]">
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            className="rounded-2xl border border-brand-dark/10 px-4 py-3 text-sm outline-none focus:border-brand-dark/40 focus:ring-2 focus:ring-brand-olive/30"
          />
          <input
            required
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="Slug"
            className="rounded-2xl border border-brand-dark/10 px-4 py-3 text-sm outline-none focus:border-brand-dark/40 focus:ring-2 focus:ring-brand-olive/30"
          />
          <input
            required
            type="number"
            step="0.1"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="Price"
            className="rounded-2xl border border-brand-dark/10 px-4 py-3 text-sm outline-none focus:border-brand-dark/40 focus:ring-2 focus:ring-brand-olive/30"
          />
          <input
            required
            type="number"
            step="0.1"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            placeholder="Stock (kg)"
            className="rounded-2xl border border-brand-dark/10 px-4 py-3 text-sm outline-none focus:border-brand-dark/40 focus:ring-2 focus:ring-brand-olive/30"
          />
          <select
            required
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="rounded-2xl border border-brand-dark/10 px-4 py-3 text-sm outline-none focus:border-brand-dark/40 focus:ring-2 focus:ring-brand-olive/30"
          >
            <option value="">Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn self-end">
            Add product
          </button>
        </form>

        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-brand-dark/10 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-brand-dark">{product.name}</h2>
                <p className="text-sm text-brand-dark/60">/{product.slug}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-brand-dark">
                <label className="flex items-center gap-2">
                  Price £
                  <input
                    type="number"
                    step="0.1"
                    defaultValue={product.price}
                    className="w-24 rounded-2xl border border-brand-dark/10 px-3 py-2"
                    onBlur={(event) => update(product.id, { price_per_kg: Number(event.target.value) })}
                  />
                </label>
                <label className="flex items-center gap-2">
                  Stock kg
                  <input
                    type="number"
                    step="0.1"
                    defaultValue={product.stock}
                    className="w-24 rounded-2xl border border-brand-dark/10 px-3 py-2"
                    onBlur={(event) => update(product.id, { stock_kg: Number(event.target.value) })}
                  />
                </label>
                <button
                  className="rounded-full border border-brand-dark/20 px-4 py-2 text-sm text-brand-dark hover:border-brand-dark"
                  onClick={() => update(product.id, { is_active: !product.is_active })}
                >
                  {product.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminGuard>
  )
}
