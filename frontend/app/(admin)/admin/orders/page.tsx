'use client'

import { useEffect, useMemo, useState } from 'react'

import AdminGuard from '@/components/AdminGuard'
import { getToken } from '@/lib/auth'
import { buildApiUrl } from '@/lib/api'
const statuses = ['pending', 'paid', 'processing', 'out_for_delivery', 'delivered', 'cancelled'] as const

type Status = (typeof statuses)[number]

interface OrderProductSummary {
  id: string
  name: string
  slug: string
}

interface OrderItemSummary {
  id: string
  qty_kg: number
  price_per_kg: number
  product: OrderProductSummary
}

interface OrderUserSummary {
  id: string
  name: string
  email: string
}

interface AdminOrder {
  id: string
  total_amount: number
  status: Status
  delivery_slot?: string | null
  address_line: string
  city: string
  postcode: string
  created_at: string
  user: OrderUserSummary
  items: OrderItemSummary[]
}

const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(buildApiUrl('/admin/orders'), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      const data: AdminOrder[] = await res.json()
      setOrders(data)
    } catch (err) {
      console.error('Failed to load orders', err)
      setError(err instanceof Error ? err.message : 'Unable to load orders right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const updateStatus = async (id: string, status: Status) => {
    const token = getToken()
    if (!token) return
    await fetch(buildApiUrl(`/admin/orders/${id}/status?status=${status}`), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    void load()
  }

  const grouped = useMemo(() => {
    const bucket = new Map<string, { user: OrderUserSummary; orders: AdminOrder[] }>()
    orders.forEach((order) => {
      const key = order.user.id
      const entry = bucket.get(key)
      if (entry) {
        entry.orders.push(order)
      } else {
        bucket.set(key, { user: order.user, orders: [order] })
      }
    })
    return Array.from(bucket.values())
  }, [orders])

  return (
    <AdminGuard>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-brand-dark">Customer orders</h1>
          <p className="text-sm text-brand-dark/60">
            Review every purchase with line-item breakdowns, delivery windows, and customer contact details.
          </p>
        </header>

        {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {loading && !error && <p className="text-sm text-brand-dark/60">Loading order history…</p>}

        {!loading && !error && grouped.length === 0 && (
          <p className="text-sm text-brand-dark/60">No orders have been placed yet.</p>
        )}

        <div className="space-y-8">
          {grouped.map(({ user, orders }) => (
            <section key={user.id} className="space-y-4">
              <header className="flex flex-col gap-1 rounded-3xl bg-white p-5 shadow">
                <h2 className="text-xl font-semibold text-brand-dark">{user.name || 'Unnamed customer'}</h2>
                <p className="text-sm text-brand-dark/60">{user.email}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-brand-dark/40">
                  {orders.length} order{orders.length === 1 ? '' : 's'}
                </p>
              </header>

              <div className="space-y-4">
                {orders.map((order) => (
                  <article key={order.id} className="space-y-4 rounded-3xl border border-brand-dark/10 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-brand-dark/50">Order ID</p>
                        <p className="text-lg font-semibold text-brand-dark">{order.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-widest text-brand-dark/50">Placed</p>
                        <p className="text-sm text-brand-dark/70">{dateFormatter.format(new Date(order.created_at))}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-2xl bg-brand-beige/40 p-4 text-sm text-brand-dark/80 md:grid-cols-2">
                      <div>
                        <p className="font-semibold">Delivery window</p>
                        <p>{order.delivery_slot || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Address</p>
                        <p>{order.address_line}</p>
                        <p>
                          {order.city}, {order.postcode}
                        </p>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-brand-dark/10">
                      <table className="min-w-full text-sm text-brand-dark/80">
                        <thead className="bg-brand-beige/60 text-brand-dark">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Product</th>
                            <th className="px-4 py-3 text-right font-semibold">Qty (kg)</th>
                            <th className="px-4 py-3 text-right font-semibold">Price / kg</th>
                            <th className="px-4 py-3 text-right font-semibold">Line total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => {
                            const lineTotal = item.qty_kg * item.price_per_kg
                            return (
                              <tr key={item.id} className="border-t border-brand-dark/10">
                                <td className="px-4 py-3">
                                  <p className="font-medium text-brand-dark">{item.product.name}</p>
                                  <p className="text-xs text-brand-dark/50">/{item.product.slug}</p>
                                </td>
                                <td className="px-4 py-3 text-right">{item.qty_kg.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right">{currency.format(item.price_per_kg)}</td>
                                <td className="px-4 py-3 text-right">{currency.format(lineTotal)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full bg-brand-olive/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-dark">
                        {order.status.replace(/_/g, ' ')}
                      </span>
                      <p className="text-lg font-semibold text-brand-dark">{currency.format(order.total_amount)}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {statuses.map((status) => (
                        <button
                          key={status}
                          className={`btn ${status === order.status ? 'opacity-60' : ''}`}
                          onClick={() => updateStatus(order.id, status)}
                        >
                          {status.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AdminGuard>
  )
}
