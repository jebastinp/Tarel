import { useCallback, useEffect, useMemo, useState } from 'react'
import { utils, writeFile } from 'xlsx'

import Header from '../components/Header'
import Loading from '../components/Loading'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

const statuses = ['pending', 'paid', 'processing', 'out_for_delivery', 'delivered', 'cancelled']

const currency = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP'
})

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short'
})

export default function OrderDetails() {
  const { token, loading: authLoading, error: authError } = useAuth()
  const [orders, setOrders] = useState([])
  const [initialising, setInitialising] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const fetchOrders = useCallback(async () => {
    if (!token) return []
    const response = await api('/admin/orders', { token })
    const list = Array.isArray(response) ? response : []
    setOrders(list)
    return list
  }, [token])

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const load = async () => {
      setInitialising(true)
      setError('')
      try {
        await fetchOrders()
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load orders', err)
          const message = err instanceof Error ? err.message : 'Unable to load orders.'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setInitialising(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [token, fetchOrders])

  const handleStatusUpdate = async (orderId, status) => {
    if (!token) return
    const key = `${orderId}-${status}`
    setUpdating(key)
    setError('')
    try {
      await api(`/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        token,
        body: { status }
      })
      await fetchOrders()
    } catch (err) {
      console.error('Failed to update order status', err)
      const message = err instanceof Error ? err.message : 'Unable to update order status.'
      setError(message)
    } finally {
      setUpdating('')
    }
  }

  const filteredOrders = useMemo(() => {
    if (!fromDate && !toDate) return orders
    const fromTs = fromDate ? new Date(fromDate).getTime() : null
    const toTs = toDate ? new Date(toDate + 'T23:59:59').getTime() : null
    return orders.filter((order) => {
      if (!order.created_at) return false
      const created = new Date(order.created_at).getTime()
      if (Number.isNaN(created)) return false
      if (fromTs && created < fromTs) return false
      if (toTs && created > toTs) return false
      return true
    })
  }, [orders, fromDate, toDate])

  const groupedByCustomer = useMemo(() => {
    const bucket = new Map()
    filteredOrders.forEach((order) => {
      const user = order.user ?? {}
      const key = user.id ?? 'unknown'
      if (!bucket.has(key)) {
        bucket.set(key, { user, orders: [] })
      }
      bucket.get(key).orders.push(order)
    })
    return Array.from(bucket.values())
  }, [filteredOrders])

  const handleDownload = () => {
    if (filteredOrders.length === 0) return
    const rows = filteredOrders.flatMap((order) => {
      const customerName = order.user?.name || 'Unnamed customer'
      const customerEmail = order.user?.email || ''
      if (!Array.isArray(order.items) || order.items.length === 0) {
        return [
          {
            OrderID: order.id,
            PlacedAt: order.created_at,
            Status: order.status,
            CustomerName: customerName,
            CustomerEmail: customerEmail,
            DeliverySlot: order.delivery_slot || 'Not specified',
            AddressLine: order.address_line,
            City: order.city,
            Postcode: order.postcode,
            Product: '',
            ProductSlug: '',
            QuantityKg: 0,
            PricePerKg: 0,
            LineTotal: 0,
            OrderTotal: Number(order.total_amount ?? 0),
          },
        ]
      }

      return order.items.map((item) => {
        const qty = Number(item.qty_kg ?? 0)
        const price = Number(item.price_per_kg ?? 0)
        return {
          OrderID: order.id,
          PlacedAt: order.created_at,
          Status: order.status,
          CustomerName: customerName,
          CustomerEmail: customerEmail,
          DeliverySlot: order.delivery_slot || 'Not specified',
          AddressLine: order.address_line,
          City: order.city,
          Postcode: order.postcode,
          Product: item.product?.name || 'Unknown product',
          ProductSlug: item.product?.slug || '',
          QuantityKg: qty,
          PricePerKg: price,
          LineTotal: qty * price,
          OrderTotal: Number(order.total_amount ?? 0),
        }
      })
    })

    const sheet = utils.json_to_sheet(rows)
    const workbook = utils.book_new()
    utils.book_append_sheet(workbook, sheet, 'Orders')
    const filenameParts = ['orders']
    if (fromDate) filenameParts.push(`from-${fromDate}`)
    if (toDate) filenameParts.push(`to-${toDate}`)
    writeFile(workbook, `${filenameParts.join('_')}.xlsx`)
  }

  if (authLoading || initialising) {
    return <Loading message="Loading orders…" />
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-primary">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-xl font-semibold">Admin session required</h1>
          <p className="mt-3 text-sm text-primary/70">
            {authError || 'Set VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD in your environment to enable automatic dashboard access.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Order details" subtitle="Full order ledger" />
      <section className="flex-1 space-y-6 bg-background px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end gap-4 rounded-3xl border border-secondary/30 bg-white p-4 sm:p-6">
          <div className="flex flex-col">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary" htmlFor="from-date">
              From
            </label>
            <input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="rounded-2xl border border-secondary/40 px-4 py-2 text-sm text-primary focus:border-secondary focus:outline-none"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary" htmlFor="to-date">
              To
            </label>
            <input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="rounded-2xl border border-secondary/40 px-4 py-2 text-sm text-primary focus:border-secondary focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setFromDate('')
              setToDate('')
            }}
            className="rounded-full border border-secondary px-4 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary hover:text-background"
          >
            Clear
          </button>
          <div className="ml-auto flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={filteredOrders.length === 0}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                filteredOrders.length === 0
                  ? 'cursor-not-allowed bg-secondary/40 text-background/70'
                  : 'bg-secondary text-primary hover:bg-primary hover:text-background'
              }`}
            >
              Download Excel
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {groupedByCustomer.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-secondary/40 bg-white p-4 text-center text-sm text-primary/60 sm:p-6">
            No orders recorded yet.
          </div>
        ) : (
          <div className="space-y-8">
            {groupedByCustomer.map(({ user, orders: customerOrders }) => (
              <section key={user.id ?? 'unknown'} className="space-y-4">
                <header className="rounded-3xl bg-white p-5 shadow">
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">Customer</p>
                  <h2 className="text-xl font-semibold text-primary">{user.name || 'Unnamed customer'}</h2>
                  <p className="text-sm text-primary/60">{user.email || 'No email on file'}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-primary/40">
                    {customerOrders.length} order{customerOrders.length === 1 ? '' : 's'}
                  </p>
                </header>

                <div className="space-y-5">
                  {customerOrders.map((order) => (
                    <article key={order.id} className="space-y-4 rounded-3xl border border-secondary/20 bg-white p-4 shadow-sm sm:p-6">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Order ID</p>
                          <p className="text-lg font-semibold text-primary">{order.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Placed</p>
                          <p className="text-sm text-primary/70">
                            {order.created_at ? dateFormatter.format(new Date(order.created_at)) : 'Unknown'}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 rounded-2xl bg-background/40 p-4 text-sm text-primary/80 md:grid-cols-2">
                        <div>
                          <p className="font-semibold text-primary">Delivery window</p>
                          <p>{order.delivery_slot || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-primary">Address</p>
                          <p>{order.address_line}</p>
                          <p>
                            {order.city}, {order.postcode}
                          </p>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-secondary/20">
                        <table className="min-w-[720px] text-left text-sm text-primary/80">
                          <thead className="bg-background text-primary">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Product</th>
                              <th className="px-4 py-3 text-right font-semibold">Qty (kg)</th>
                              <th className="px-4 py-3 text-right font-semibold">Price / kg</th>
                              <th className="px-4 py-3 text-right font-semibold">Line total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(order.items ?? []).map((item) => {
                              const qty = Number(item.qty_kg ?? 0)
                              const price = Number(item.price_per_kg ?? 0)
                              const lineTotal = qty * price
                              return (
                                <tr key={item.id} className="border-t border-secondary/20">
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-primary">{item.product?.name || 'Unknown product'}</p>
                                    <p className="text-xs text-primary/50">/{item.product?.slug || 'n/a'}</p>
                                  </td>
                                  <td className="px-4 py-3 text-right">{qty.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-right">{currency.format(price)}</td>
                                  <td className="px-4 py-3 text-right">{currency.format(lineTotal)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {statuses.map((status) => {
                            const isActive = status === order.status
                            const key = `${order.id}-${status}`
                            const busy = updating === key
                            return (
                              <button
                                key={status}
                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                  isActive
                                    ? 'border-secondary bg-secondary text-primary'
                                    : 'border-secondary/40 text-secondary hover:border-secondary hover:bg-secondary/10'
                                } ${busy ? 'opacity-60' : ''}`}
                                onClick={() => handleStatusUpdate(order.id, status)}
                                disabled={busy}
                              >
                                {status.replace(/_/g, ' ')}
                              </button>
                            )
                          })}
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Order total</p>
                          <p className="text-xl font-semibold text-primary">
                            {currency.format(Number(order.total_amount ?? 0))}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
