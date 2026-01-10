import { useCallback, useEffect, useState } from 'react'

import Header from '../components/Header'
import Loading from '../components/Loading'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { exportToCsv } from '../utils/exportCsv'

const ORDER_STATUSES = ['pending', 'paid', 'processing', 'out_for_delivery', 'delivered', 'cancelled']

export default function Orders() {
  const { token, loading: authLoading, error: authError } = useAuth()
  const [orders, setOrders] = useState([])
  const [initialising, setInitialising] = useState(true)
  const [error, setError] = useState('')
  const [busyOrder, setBusyOrder] = useState('')
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
    let alive = true

    const load = async () => {
      setInitialising(true)
      setError('')
      try {
        await fetchOrders()
      } catch (err) {
        if (!alive) return
        console.error('Failed to load orders', err)
        const message = err instanceof Error ? err.message : 'Unable to load orders.'
        setError(message)
      } finally {
        if (alive) {
          setInitialising(false)
        }
      }
    }

    load()

    return () => {
      alive = false
    }
  }, [token, fetchOrders])

  const updateStatus = async (id, status) => {
    if (!token) return
    setError('')
    setBusyOrder(id)
    try {
      await api(`/admin/orders/${id}/status`, {
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
      setBusyOrder('')
    }
  }

  const rangeError = (() => {
    if (!fromDate || !toDate) return ''
    const start = new Date(`${fromDate}T00:00:00`)
    const end = new Date(`${toDate}T23:59:59.999`)
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) return ''
    return end < start ? 'End date must be on or after the start date.' : ''
  })()

  const filteredOrders = orders.filter((order) => {
    const created = order.created_at ? new Date(order.created_at) : null
    if (!created || Number.isNaN(created.valueOf())) return false

    if (fromDate) {
      const start = new Date(`${fromDate}T00:00:00`)
      if (!Number.isNaN(start.valueOf()) && created < start) return false
    }

    if (toDate) {
      const end = new Date(`${toDate}T23:59:59.999`)
      if (!Number.isNaN(end.valueOf()) && created > end) return false
    }

    return true
  })

  const visibleOrders = rangeError ? [] : (fromDate || toDate ? filteredOrders : orders)

  const handleClearFilters = () => {
    setFromDate('')
    setToDate('')
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
  <Header title="Orders" />
  <section className="flex-1 space-y-6 bg-background px-4 py-6 sm:px-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-secondary">Track live orders, update delivery statuses.</p>
            <button
              onClick={() => exportToCsv('orders.csv', visibleOrders.length ? visibleOrders : orders)}
              className="rounded-full border border-secondary px-4 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary hover:text-background"
            >
              Export CSV
            </button>
          </div>

          <div className="rounded-2xl border border-secondary/20 bg-white/60 p-4">
            <form className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col text-sm">
                <label htmlFor="orders-from" className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                  From date
                </label>
                <input
                  id="orders-from"
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="rounded-xl border border-secondary/30 bg-white px-3 py-2 text-sm text-primary shadow-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>
              <div className="flex flex-col text-sm">
                <label htmlFor="orders-to" className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                  To date
                </label>
                <input
                  id="orders-to"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(event) => setToDate(event.target.value)}
                  className="rounded-xl border border-secondary/30 bg-white px-3 py-2 text-sm text-primary shadow-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                />
              </div>
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-full border border-secondary/40 px-4 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary/10"
              >
                Clear filters
              </button>
              {(fromDate || toDate) && !rangeError && (
                <p className="text-xs text-primary/60">
                  Showing {visibleOrders.length} order{visibleOrders.length === 1 ? '' : 's'} between the selected dates.
                </p>
              )}
            </form>
            {rangeError && (
              <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{rangeError}</p>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-3xl border border-background bg-white shadow">
          <table className="min-w-[720px] divide-y divide-background/60">
            <thead className="bg-secondary text-background">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Total (£)</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider">Address</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-background/60 text-sm text-primary">
              {visibleOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">#{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-secondary">
                      {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{order.user?.name || '—'}</p>
                    <p className="text-xs text-secondary">{order.user?.email}</p>
                  </td>
                  <td className="px-4 py-3">£{Number(order.total_amount ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={(event) => updateStatus(order.id, event.target.value)}
                      disabled={busyOrder === order.id}
                      className="rounded-full border border-secondary/40 px-3 py-1 text-xs focus:border-secondary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <p>{order.delivery_slot || '—'}</p>
                    <p className="text-xs text-secondary">
                      {order.city} {order.postcode}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="rounded-full bg-secondary/15 px-3 py-1 text-xs text-secondary">
                      {order.status.replaceAll('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleOrders.length === 0 && !rangeError && (
            <p className="p-6 text-center text-sm text-secondary">
              {orders.length === 0
                ? 'No orders yet.'
                : 'No orders found for the selected date range.'}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
