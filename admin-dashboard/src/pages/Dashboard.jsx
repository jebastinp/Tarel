import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

function toDateTimeLocalValue(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.valueOf())) return ''
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDateTimeLocalValue(value) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf())) return null
  return parsed.toISOString()
}

const currency = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP'
})

function groupMonthly(orders) {
  const bucket = new Map()
  orders.forEach((order) => {
    const created = order.created_at ? new Date(order.created_at) : null
    if (!created || Number.isNaN(created.valueOf())) return
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`
    bucket.set(key, (bucket.get(key) ?? 0) + Number(order.total_amount ?? 0))
  })
  return Array.from(bucket.entries())
    .map(([month, sales]) => ({ month, sales }))
    .sort((a, b) => (a.month > b.month ? 1 : -1))
}

function countStatuses(orders) {
  const counts = new Map()
  orders.forEach((order) => {
    const status = order.status ?? 'pending'
    counts.set(status, (counts.get(status) ?? 0) + 1)
  })
  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }))
}

function extractDeliveryErrorMessage(error) {
  const defaultMessage = 'Unable to update next delivery window.'
  if (!error) return defaultMessage

  const rawMessage = error instanceof Error ? error.message : String(error ?? '')
  if (!rawMessage) {
    return defaultMessage
  }

  try {
    const parsed = JSON.parse(rawMessage)
    const detailList = Array.isArray(parsed?.detail) ? parsed.detail : []

    const targeted = detailList.find((item) => {
      if (!item || typeof item !== 'object') return false
      const loc = Array.isArray(item.loc) ? item.loc : []
      return loc.includes('cutoff_at')
    })

    if (targeted && typeof targeted.msg === 'string') {
      return targeted.msg.replace(/^Value error,\s*/i, '')
    }

    const firstMessage = detailList.find((item) => typeof item?.msg === 'string')
    if (firstMessage) {
      return firstMessage.msg.replace(/^Value error,\s*/i, '')
    }

    if (typeof parsed.message === 'string') {
      return parsed.message
    }
  } catch (parseError) {
    // Fall back to the raw message if it's not JSON
  }

  if (/^\s*[\[{]/.test(rawMessage)) {
    return defaultMessage
  }

  return rawMessage || defaultMessage
}

export default function Dashboard() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [nextDelivery, setNextDelivery] = useState(null)
  const [deliveryInput, setDeliveryInput] = useState('')
  const [cutoffInput, setCutoffInput] = useState('')
  const [windowLabelInput, setWindowLabelInput] = useState('')
  const [deliveryFeedback, setDeliveryFeedback] = useState('')
  const [deliveryError, setDeliveryError] = useState('')
  const [updatingDelivery, setUpdatingDelivery] = useState(false)

  const deliveryDateFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' }),
    []
  )
  const deliveryTimestampFormatter = useMemo(
    () => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }),
    []
  )

  useEffect(() => {
    if (!token) return

    let alive = true

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const [ordersData, usersData, productsData] = await Promise.all([
          api('/admin/orders', { token }),
          api('/admin/users', { token }),
          api('/admin/products', { token })
        ])

        if (!alive) return

        const normalizedOrders = Array.isArray(ordersData) ? ordersData : []
        const normalizedUsers = Array.isArray(usersData) ? usersData : []

        const extractRole = (maybeRole) => {
          if (!maybeRole) return ''
          if (typeof maybeRole === 'string') return maybeRole
          if (typeof maybeRole === 'object') {
            if ('value' in maybeRole) return maybeRole.value
            if ('role' in maybeRole) return maybeRole.role
          }
          return ''
        }

        setOrders(normalizedOrders)
        setCustomers(
          normalizedUsers.filter((user) => {
            const role = extractRole(user.role)
            return role === 'user'
          })
        )
        setProducts(Array.isArray(productsData) ? productsData : [])
      } catch (err) {
        if (!alive) return
        console.error('Failed to load admin dashboard data', err)
        setError(err instanceof Error ? err.message : 'Unable to load dashboard data.')
      } finally {
        if (alive) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      alive = false
    }
  }, [token])

  useEffect(() => {
    if (!token) return

    let alive = true

    const loadDelivery = async () => {
      try {
        const data = await api('/admin/site/next-delivery', { token })
        if (!alive) return
        setNextDelivery(data)
        setDeliveryInput(data?.scheduled_for ?? '')
        setCutoffInput(toDateTimeLocalValue(data?.cutoff_at ?? ''))
        setWindowLabelInput(data?.window_label ?? '')
        setDeliveryError('')
      } catch (err) {
        if (!alive) return
        console.error('Failed to load next delivery window', err)
        setDeliveryError(
          err instanceof Error ? err.message : 'Unable to load next delivery window.'
        )
      }
    }

    loadDelivery()

    return () => {
      alive = false
    }
  }, [token])

  useEffect(() => {
    if (!deliveryFeedback) return
    const timer = setTimeout(() => setDeliveryFeedback(''), 4000)
    return () => clearTimeout(timer)
  }, [deliveryFeedback])

  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0),
    [orders]
  )

  const statusCounts = useMemo(() => countStatuses(orders), [orders])
  const monthlySales = useMemo(() => groupMonthly(orders), [orders])

  const nextDeliveryDisplay = useMemo(() => {
    if (!nextDelivery || !nextDelivery.scheduled_for) {
      return 'No delivery scheduled'
    }
    try {
      return deliveryDateFormatter.format(new Date(nextDelivery.scheduled_for))
    } catch (err) {
      console.error('Failed to format next delivery date', err)
      return nextDelivery.scheduled_for
    }
  }, [nextDelivery, deliveryDateFormatter])

  const lastUpdatedDisplay = useMemo(() => {
    if (!nextDelivery || !nextDelivery.updated_at) {
      return null
    }
    try {
      return deliveryTimestampFormatter.format(new Date(nextDelivery.updated_at))
    } catch (err) {
      console.error('Failed to format next delivery timestamp', err)
      return nextDelivery.updated_at
    }
  }, [nextDelivery, deliveryTimestampFormatter])

  const cutoffDisplay = useMemo(() => {
    if (!nextDelivery || !nextDelivery.cutoff_at) {
      return null
    }
    try {
      return deliveryTimestampFormatter.format(new Date(nextDelivery.cutoff_at))
    } catch (err) {
      console.error('Failed to format cutoff timestamp', err)
      return nextDelivery.cutoff_at
    }
  }, [nextDelivery, deliveryTimestampFormatter])

  const handleUpdateNextDelivery = async (
    scheduledFor = deliveryInput,
    cutoffValue = cutoffInput,
    labelValue = windowLabelInput
  ) => {
    if (!token) return
    setUpdatingDelivery(true)
    setDeliveryFeedback('')
    setDeliveryError('')

    try {
      const payload = {
        scheduled_for: scheduledFor || null,
        cutoff_at: fromDateTimeLocalValue(cutoffValue),
        window_label: labelValue?.trim() ? labelValue.trim() : null
      }
      const data = await api('/admin/site/next-delivery', {
        method: 'PUT',
        body: payload,
        token
      })
      setNextDelivery(data)
      setDeliveryInput(data?.scheduled_for ?? '')
      setCutoffInput(toDateTimeLocalValue(data?.cutoff_at ?? ''))
      setWindowLabelInput(data?.window_label ?? '')
      const hasSchedule = Boolean(payload.scheduled_for)
      setDeliveryFeedback(
        hasSchedule ? 'Next delivery window updated' : 'Next delivery window cleared'
      )
    } catch (err) {
      console.error('Failed to update next delivery window', err)
      setDeliveryError(extractDeliveryErrorMessage(err))
    } finally {
      setUpdatingDelivery(false)
    }
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-secondary">Operations</p>
          <h1 className="text-3xl font-semibold text-primary">Executive overview</h1>
        </div>
        <p className="text-sm text-primary/60">
          Snapshot of orders, revenue, customers, and catalogue health from the FastAPI backend.
        </p>
      </header>

      <Panel title="Next delivery window" loading={updatingDelivery}>
        <p className="text-sm text-primary/70">
          {nextDelivery && nextDelivery.scheduled_for
            ? `Scheduled for ${nextDeliveryDisplay}`
            : 'No delivery date scheduled. Set one to surface on the customer storefront.'}
        </p>
        {nextDelivery?.window_label && (
          <p className="mt-2 text-sm font-semibold text-secondary/80">
            {nextDelivery.window_label}
          </p>
        )}
        {cutoffDisplay && (
          <p className="mt-1 text-xs text-primary/60">Order cut-off {cutoffDisplay}</p>
        )}
        {lastUpdatedDisplay && (
          <p className="mt-1 text-xs text-primary/40">Last updated {lastUpdatedDisplay}</p>
        )}

        <form
          onSubmit={async (event) => {
            event.preventDefault()
            await handleUpdateNextDelivery(
              deliveryInput ? deliveryInput : null,
              cutoffInput,
              windowLabelInput
            )
          }}
          className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <label className="flex flex-1 flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/60">
            Schedule date
            <input
              type="date"
              value={deliveryInput}
              onChange={(event) => setDeliveryInput(event.target.value)}
              className="w-full rounded-2xl border border-secondary/40 px-4 py-3 text-sm font-normal text-primary outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
          </label>
          <label className="flex flex-1 flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/60">
            Order cutoff
            <input
              type="datetime-local"
              value={cutoffInput}
              onChange={(event) => setCutoffInput(event.target.value)}
              className="w-full rounded-2xl border border-secondary/40 px-4 py-3 text-sm font-normal text-primary outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
          </label>
          <label className="flex flex-1 flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/60 xl:col-span-1 xl:col-start-auto">
            Window label
            <input
              type="text"
              value={windowLabelInput}
              onChange={(event) => setWindowLabelInput(event.target.value)}
              placeholder="e.g. Delivery window"
              className="w-full rounded-2xl border border-secondary/40 px-4 py-3 text-sm font-normal text-primary outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            />
          </label>
          <div className="col-span-full flex gap-3 md:col-span-2 md:justify-end xl:col-span-1">
            <button
              type="submit"
              disabled={updatingDelivery}
              className="flex-1 rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save window
            </button>
            <button
              type="button"
              onClick={() => handleUpdateNextDelivery(null, '', '')}
              disabled={updatingDelivery}
              className="flex-1 rounded-2xl border border-secondary/30 px-4 py-3 text-sm font-semibold text-secondary transition hover:border-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear window
            </button>
          </div>
        </form>

        {deliveryFeedback && (
          <p className="mt-3 rounded-2xl border border-secondary/20 bg-secondary/10 px-4 py-3 text-xs font-medium text-secondary">
            {deliveryFeedback}
          </p>
        )}
        {deliveryError && (
          <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
            {deliveryError}
          </p>
        )}
      </Panel>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total revenue"
          value={currency.format(totalRevenue)}
          loading={loading}
        />
        <MetricCard title="Orders" value={orders.length} loading={loading} />
        <MetricCard title="Customers" value={customers.length} loading={loading} />
        <MetricCard
          title="Active products"
          value={products.filter((p) => p.is_active).length}
          loading={loading}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Monthly sales" loading={loading}>
          {monthlySales.length === 0 ? (
            <EmptyState message="No sales recorded yet" />
          ) : (
            <ul className="space-y-3 text-sm">
              {monthlySales.map((row) => (
                <li
                  key={row.month}
                  className="flex items-center justify-between rounded-xl border border-primary/10 px-4 py-3"
                >
                  <span className="font-medium text-primary/80">{row.month}</span>
                  <span className="font-semibold text-primary">
                    {currency.format(Number(row.sales ?? 0))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Order status" loading={loading}>
          {statusCounts.length === 0 ? (
            <EmptyState message="No orders yet" />
          ) : (
            <ul className="space-y-3 text-sm">
              {statusCounts.map((row) => (
                <li
                  key={row.status}
                  className="flex items-center justify-between rounded-xl border border-primary/10 px-4 py-3 capitalize"
                >
                  <span className="font-medium text-primary/80">{row.status.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-primary">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <Panel title="Catalogue snapshot" loading={loading}>
        {products.length === 0 ? (
          <EmptyState message="No products available." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-primary/10">
            <table className="min-w-[600px] text-left text-sm">
              <thead className="bg-background text-primary/70">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Price / kg</th>
                  <th className="px-4 py-3 font-semibold">Stock (kg)</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 10).map((product) => (
                  <tr key={product.id} className="border-t border-primary/10">
                    <td className="px-4 py-3 text-primary/80">{product.name}</td>
                    <td className="px-4 py-3 text-primary">
                      {currency.format(Number(product.price ?? product.price_per_kg ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-primary/70">{product.stock ?? product.stock_kg ?? 0}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          product.is_active ? 'bg-secondary/20 text-secondary' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

function MetricCard({ title, value, loading }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm sm:p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-primary/60">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-primary">
        {loading ? <span className="text-sm text-primary/50">Loading…</span> : value}
      </p>
    </div>
  )
}

function Panel({ title, children, loading }) {
  return (
    <div className="rounded-3xl border border-primary/10 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        {loading && <span className="text-xs text-primary/50">Updating…</span>}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-10 text-center text-sm text-primary/60">
      {message}
    </div>
  )
}
