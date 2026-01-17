'use client'

import { useCallback, useEffect, useState } from 'react'

import { buildApiUrl } from '@/lib/api'
import type { Order } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'

const formatStatus = (status: string) =>
  status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export default function MyOrders() {
  const { user, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (authLoading) {
      return
    }

    let cancelled = false

    const loadOrders = async () => {
      try {
        if (!cancelled) {
          setIsLoading(true)
          setError(null)
          setBanner(null)
        }

        const { getToken } = await import('@/lib/auth')
        const token = getToken()

        if (!token || !user) {
          if (!cancelled) {
            setOrders([])
            setIsLoading(false)
          }
          return
        }

        const res = await fetch(buildApiUrl('/orders/my'), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        })

        if (!res.ok) {
          const message = await res.text()
          throw new Error(message || 'Failed to fetch orders')
        }

        const payload: Order[] = await res.json()
        if (!cancelled) {
          setOrders(payload)
        }
      } catch (err) {
        if (cancelled) {
          return
        }
        console.error('Failed to load orders', err)
        setError(err instanceof Error ? err.message : 'Unexpected error')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadOrders()

    return () => {
      cancelled = true
    }
  }, [authLoading, user])

  const formatCurrency = (value: number) => `£${value.toFixed(2)}`

  return (
    <div className="space-y-6">
  <div className="rounded-3xl bg-gradient-to-r from-brand-dark to-brand-olive/80 p-5 text-white shadow-lg sm:p-6">
        <h2 className="text-lg font-medium uppercase tracking-[0.35em] text-white/70">Order history</h2>
        <p className="mt-2 text-3xl font-semibold">Catch up on your recent deliveries</p>
        <p className="mt-3 max-w-2xl text-sm text-white/80">
          Every order you place through Tarel is logged here with delivery slots, spend totals, and handy delivery
          details whenever you need them.
        </p>
      </div>

      {banner && (
        <div
          className={`rounded-3xl border px-4 py-3 text-sm sm:px-5 sm:py-4 ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {banner.message}
        </div>
      )}

    {authLoading || isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-3xl bg-white/60" />
          ))}
        </div>
      ) : error ? (
  <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:p-6">
          <p className="font-semibold">We couldn&apos;t fetch your orders</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-brand-dark/20 bg-white p-10 text-center text-brand-dark/70">
          <p className="text-lg font-semibold">No orders just yet</p>
          <p className="mt-2 text-sm">
            Once you place an order, it will appear here with full tracking information.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: Order) => {
            const statusLabel = formatStatus(order.status)

            return (
              <article key={order.id} className="rounded-3xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
                <header className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-brand-dark/50">Order</p>
                    <h3 className="text-xl font-semibold text-brand-dark">#{order.id.slice(0, 8).toUpperCase()}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-dark px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                      {statusLabel}
                    </span>
                  </div>
                </header>

                <dl className="mt-4 grid gap-4 text-sm text-brand-dark/80 md:grid-cols-3">
                  <div>
                    <dt className="font-semibold text-brand-dark">Placed on</dt>
                    <dd>{new Date(order.created_at).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-brand-dark">Delivery window</dt>
                    <dd>{order.delivery_slot ?? 'Assigned closer to dispatch'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-brand-dark">Destination</dt>
                    <dd>
                      <span className="block">{order.address_line}</span>
                      <span>{[order.city, order.postcode].filter(Boolean).join(', ')}</span>
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 rounded-2xl bg-brand-beige/40 p-4">
                  <p className="text-sm font-semibold text-brand-dark">Line items</p>
                  <ul className="mt-3 space-y-3 text-sm">
                    {order.items.map((item: Order['items'][number], index: number) => {
                      const lineTotal = item.qty_kg * item.price_per_kg
                      return (
                        <li
                          key={`${order.id}-${item.product_id}-${index}`}
                          className="flex items-start justify-between gap-4 rounded-2xl bg-white/60 p-3 text-brand-dark"
                        >
                          <div>
                            <p className="font-semibold text-brand-dark">{item.product.name}</p>
                            <p className="text-xs text-brand-dark/60">
                              {item.qty_kg.toFixed(2)} kg × {formatCurrency(item.price_per_kg)}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-brand-dark">{formatCurrency(lineTotal)}</span>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="mt-4 flex items-center justify-between text-brand-dark">
                    <span className="text-sm font-semibold uppercase tracking-widest">Total paid</span>
                    <span className="text-lg font-semibold">{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
