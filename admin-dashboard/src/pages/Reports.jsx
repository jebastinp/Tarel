import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Download,
  Mail,
  Package,
  Repeat,
  ShoppingCart,
  TrendingUp,
  Users as UsersIcon
} from 'lucide-react'

import Header from '../components/Header'
import Loading from '../components/Loading'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { exportToCsv } from '../utils/exportCsv'

const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
const numberFormatter = new Intl.NumberFormat('en-GB')
const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' })
const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' })

const asNumber = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function calculateMonthlySales(orders) {
  const bucket = new Map()
  orders.forEach((order) => {
    const created = order.created_at ? new Date(order.created_at) : null
    if (!created || Number.isNaN(created.valueOf())) return
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`
    bucket.set(key, (bucket.get(key) ?? 0) + asNumber(order.total_amount))
  })
  return Array.from(bucket.entries())
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => (a.month > b.month ? 1 : -1))
}

function calculateTopProducts(orders) {
  const totals = new Map()
  orders.forEach((order) => {
    ;(order.items ?? []).forEach((item) => {
      const product = item.product ?? {}
      const id = product.id || item.product_id
      if (!id) return
      const current = totals.get(id) || {
        product_id: id,
        name: product.name || 'Unknown product',
        slug: product.slug || 'n/a',
        orders: 0,
        revenue: 0,
        quantity: 0
      }
      const qty = asNumber(item.qty_kg)
      const price = asNumber(item.price_per_kg)
      current.orders += 1
      current.revenue += qty * price
      current.quantity += qty
      totals.set(id, current)
    })
  })
  return Array.from(totals.values()).sort((a, b) => b.revenue - a.revenue)
}

function calculateCategoryRevenue(orders, products) {
  const productCategory = new Map(
    products.map((product) => [product.id, product.category?.name || 'Uncategorised'])
  )
  const totals = new Map()
  orders.forEach((order) => {
    ;(order.items ?? []).forEach((item) => {
      const productId = item.product?.id || item.product_id
      const category = productCategory.get(productId) || 'Uncategorised'
      const qty = asNumber(item.qty_kg)
      const price = asNumber(item.price_per_kg)
      totals.set(category, (totals.get(category) ?? 0) + qty * price)
    })
  })
  return Array.from(totals.entries())
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
}

function calculateCustomerSpend(orders) {
  const spend = new Map()
  orders.forEach((order) => {
    const userId = order.user?.id
    if (!userId) return
    const current = spend.get(userId) || {
      id: userId,
      name: order.user.name || 'Unknown customer',
      email: order.user.email || 'unknown@tarel.local',
      orders: 0,
      total: 0,
      lastOrder: null
    }
    current.orders += 1
    current.total += asNumber(order.total_amount)
    const created = order.created_at ? new Date(order.created_at) : null
    if (created && (!current.lastOrder || created > current.lastOrder)) {
      current.lastOrder = created
    }
    spend.set(userId, current)
  })
  return Array.from(spend.values()).sort((a, b) => b.total - a.total)
}

function calculateRetention(orders) {
  const counts = new Map()
  orders.forEach((order) => {
    const userId = order.user?.id
    if (!userId) return
    counts.set(userId, (counts.get(userId) ?? 0) + 1)
  })
  let returning = 0
  let firstTimers = 0
  counts.forEach((value) => {
    if (value > 1) returning += 1
    else firstTimers += 1
  })
  return { returning, firstTimers }
}

function calculateRecentOrders(orders, limit = Infinity) {
  return [...orders]
    .sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0))
    .slice(0, limit)
}

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-3xl border border-secondary/20 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <span className="rounded-2xl bg-secondary/10 p-2 text-secondary">
          <Icon size={20} />
        </span>
        <p className="text-xs uppercase tracking-[0.3em] text-secondary">{label}</p>
      </div>
      <p className="mt-4 text-2xl font-semibold text-primary">{value}</p>
      {helper && <p className="mt-1 text-xs text-primary/60">{helper}</p>}
    </div>
  )
}

function MetricList({ title, description, rows, emptyMessage }) {
  return (
    <div className="rounded-3xl border border-secondary/20 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-secondary">{title}</h3>
          {description && <p className="mt-2 text-xs text-primary/60">{description}</p>}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-secondary/30 bg-background px-4 py-10 text-center text-sm text-secondary">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-6 space-y-3 text-sm text-primary/80">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-secondary/20 bg-background/40 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-primary">{row.label}</p>
                  {row.subtitle && <p className="text-xs text-primary/60">{row.subtitle}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">{row.value}</p>
                  {row.meta && <p className="text-[11px] uppercase tracking-[0.3em] text-primary/50">{row.meta}</p>}
                </div>
              </div>
              {row.progress != null && (
                <div className="mt-3 h-2 rounded-full bg-secondary/10">
                  <div className="h-full rounded-full bg-secondary" style={{ width: `${row.progress}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PaginationControls({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const goTo = (nextPage) => {
    if (nextPage < 0 || nextPage >= totalPages) return
    onPageChange(nextPage)
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-primary/70 sm:justify-end">
      <button
        onClick={() => goTo(page - 1)}
        disabled={page === 0}
        className="rounded-full border border-secondary/30 px-3 py-1 font-semibold transition hover:bg-secondary hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        Prev
      </button>
      <span className="rounded-full bg-secondary/10 px-3 py-1 font-semibold text-secondary">
        Page {page + 1} of {totalPages}
      </span>
      <button
        onClick={() => goTo(page + 1)}
        disabled={page + 1 >= totalPages}
        className="rounded-full border border-secondary/30 px-3 py-1 font-semibold transition hover:bg-secondary hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  )
}

function TableCard({ title, columns, rows, emptyMessage, icon: Icon, footer }) {
  return (
    <div className="rounded-3xl border border-secondary/20 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        {Icon && (
          <span className="rounded-xl bg-secondary/10 p-2 text-secondary">
            <Icon size={18} />
          </span>
        )}
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-secondary">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-secondary/30 bg-background px-4 py-10 text-center text-sm text-secondary">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[640px] text-left text-sm text-primary/80">
            <thead className="border-b border-secondary/20 text-xs uppercase tracking-[0.3em] text-secondary">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-3 py-2 font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-secondary/10">
                  {row.cells.map((cell, index) => (
                    <td key={index} className="px-3 py-3 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footer && rows.length > 0 && (
        <div className="mt-6 border-t border-secondary/20 pt-4">{footer}</div>
      )}
    </div>
  )
}

export default function Reports() {
  const { token, loading: authLoading, error: authError } = useAuth()
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [initialising, setInitialising] = useState(true)
  const [error, setError] = useState('')
  const [emailing, setEmailing] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const load = async () => {
      setInitialising(true)
      setError('')
      try {
        const [ordersResponse, productsResponse, usersResponse] = await Promise.all([
          api('/admin/orders', { token }),
          api('/admin/products', { token }),
          api('/admin/users', { token })
        ])

        if (cancelled) return
        setOrders(Array.isArray(ordersResponse) ? ordersResponse : [])
        setProducts(Array.isArray(productsResponse) ? productsResponse : [])
        setUsers(Array.isArray(usersResponse) ? usersResponse : [])
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load report data', err)
        const message = err instanceof Error ? err.message : 'Unable to load reports.'
        setError(message)
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
  }, [token])

  const monthlySales = useMemo(() => calculateMonthlySales(orders), [orders])
  const topProducts = useMemo(() => calculateTopProducts(orders), [orders])
  const categoryRevenue = useMemo(() => calculateCategoryRevenue(orders, products), [orders, products])
  const customerSpend = useMemo(() => calculateCustomerSpend(orders), [orders])
  const retention = useMemo(() => calculateRetention(orders), [orders])
  const recentOrders = useMemo(() => calculateRecentOrders(orders), [orders])

  const totalRevenue = useMemo(
    () => orders.reduce((acc, order) => acc + asNumber(order.total_amount), 0),
    [orders]
  )
  const orderCount = orders.length
  const averageOrderValue = orderCount ? totalRevenue / orderCount : 0

  const last30DaysRevenue = useMemo(() => {
    if (orders.length === 0) return 0
    const threshold = new Date()
    threshold.setDate(threshold.getDate() - 30)
    return orders
      .filter((order) => {
        const created = order.created_at ? new Date(order.created_at) : null
        return created && created >= threshold
      })
      .reduce((acc, order) => acc + asNumber(order.total_amount), 0)
  }, [orders])

  const lastOrderDate = useMemo(() => {
    if (orders.length === 0) return null
    return orders.reduce((latest, order) => {
      const created = order.created_at ? new Date(order.created_at) : null
      if (!created) return latest
      if (!latest || created > latest) return created
      return latest
    }, null)
  }, [orders])

  const uniqueCustomers = useMemo(() => {
    const ids = new Set()
    orders.forEach((order) => {
      if (order.user?.id) ids.add(order.user.id)
    })
    return ids.size
  }, [orders])

  const lowStockProducts = useMemo(
    () =>
      products
        .filter((product) => asNumber(product.stock_kg) <= 25)
        .sort((a, b) => asNumber(a.stock_kg) - asNumber(b.stock_kg)),
    [products]
  )

  const stockLeaders = useMemo(
    () =>
      products
        .map((product) => ({
          id: product.id,
          name: product.name,
          stock: asNumber(product.stock_kg),
          category: product.category?.name || 'Uncategorised'
        }))
        .sort((a, b) => b.stock - a.stock),
    [products]
  )

  const recentMonthlySales = useMemo(() => {
    if (monthlySales.length === 0) return []
    const lastSix = monthlySales.slice(-6)
    const maxRevenue = Math.max(...lastSix.map((row) => row.revenue)) || 1
    return lastSix
      .map((row) => ({
        id: row.month,
        label: monthFormatter.format(new Date(`${row.month}-01`)),
        value: currency.format(row.revenue),
        progress: Math.max((row.revenue / maxRevenue) * 100, 4)
      }))
      .reverse()
  }, [monthlySales])

  const topProductRows = useMemo(() => {
    if (topProducts.length === 0) return []
    const leaders = topProducts.slice(0, 5)
    const maxRevenue = Math.max(...leaders.map((row) => row.revenue)) || 1
    return leaders.map((product) => ({
      id: product.product_id,
      label: product.name,
      subtitle: `${numberFormatter.format(product.quantity)} kg • ${numberFormatter.format(product.orders)} orders`,
      value: currency.format(product.revenue),
      progress: Math.max((product.revenue / maxRevenue) * 100, 4)
    }))
  }, [topProducts])

  const categoryRows = useMemo(() => {
    if (categoryRevenue.length === 0) return []
    const maxRevenue = Math.max(...categoryRevenue.map((row) => row.revenue)) || 1
    return categoryRevenue.slice(0, 6).map((row) => ({
      id: row.category,
      label: row.category,
      value: currency.format(row.revenue),
      progress: Math.max((row.revenue / maxRevenue) * 100, 4)
    }))
  }, [categoryRevenue])

  const customerRows = useMemo(() => {
    if (customerSpend.length === 0) return []
    return customerSpend.map((customer) => ({
      id: customer.id,
      cells: [
        (
          <div className="space-y-1" key="customer">
            <p className="font-semibold text-primary">{customer.name}</p>
            <p className="text-xs text-primary/60">{customer.email}</p>
          </div>
        ),
        <span key="orders" className="font-semibold text-primary">
          {numberFormatter.format(customer.orders)}
        </span>,
        <span key="total" className="font-semibold text-primary">
          {currency.format(customer.total)}
        </span>,
        <span key="last" className="text-xs text-primary/60">
          {customer.lastOrder ? dateFormatter.format(customer.lastOrder) : '—'}
        </span>
      ]
    }))
  }, [customerSpend])

  const recentOrderRows = useMemo(() => {
    if (recentOrders.length === 0) return []
    return recentOrders.map((order) => ({
      id: order.id,
      cells: [
        (
          <div className="space-y-1" key="reference">
            <p className="font-semibold text-primary">#{order.id.slice(0, 8)}</p>
            <p className="text-xs text-primary/60">{order.user?.name || 'Unknown customer'}</p>
          </div>
        ),
        <span key="date" className="text-xs text-primary/60">
          {order.created_at ? dateFormatter.format(new Date(order.created_at)) : '—'}
        </span>,
        <span key="items" className="text-xs text-primary/60">
          {numberFormatter.format(order.items?.length ?? 0)} items
        </span>,
        <span key="total" className="font-semibold text-primary">
          {currency.format(asNumber(order.total_amount))}
        </span>
      ]
    }))
  }, [recentOrders])

  const lowStockRows = useMemo(
    () =>
      lowStockProducts.map((product) => ({
        id: product.id,
        cells: [
          <span key="name" className="font-semibold text-primary">{product.name}</span>,
          <span key="qty" className="text-sm text-primary/70">{numberFormatter.format(asNumber(product.stock_kg))} kg</span>,
          <span key="category" className="text-xs text-primary/60">{product.category?.name || 'Uncategorised'}</span>
        ]
      })),
    [lowStockProducts]
  )

  const stockLeaderRows = useMemo(
    () =>
      stockLeaders.map((item) => ({
        id: item.id,
        cells: [
          <span key="name" className="font-semibold text-primary">{item.name}</span>,
          <span key="stock" className="text-sm text-primary/70">{numberFormatter.format(item.stock)}</span>,
          <span key="category" className="text-xs text-primary/60">{item.category}</span>
        ]
      })),
    [stockLeaders]
  )

  const retentionRate = (() => {
    const total = retention.returning + retention.firstTimers
    if (!total) return 0
    return (retention.returning / total) * 100
  })()

  const PAGE_SIZE = 8
  const INVENTORY_PAGE_SIZE = 6

  const [customerPage, setCustomerPage] = useState(0)
  const [orderPage, setOrderPage] = useState(0)
  const [lowStockPage, setLowStockPage] = useState(0)
  const [stockPage, setStockPage] = useState(0)

  const customerTotalPages = Math.ceil(customerRows.length / PAGE_SIZE) || 0
  const orderTotalPages = Math.ceil(recentOrderRows.length / PAGE_SIZE) || 0
  const lowStockTotalPages = Math.ceil(lowStockRows.length / INVENTORY_PAGE_SIZE) || 0
  const stockTotalPages = Math.ceil(stockLeaderRows.length / INVENTORY_PAGE_SIZE) || 0

  const paginatedCustomerRows = useMemo(() => {
    const start = customerPage * PAGE_SIZE
    return customerRows.slice(start, start + PAGE_SIZE)
  }, [customerRows, customerPage])

  const paginatedOrderRows = useMemo(() => {
    const start = orderPage * PAGE_SIZE
    return recentOrderRows.slice(start, start + PAGE_SIZE)
  }, [recentOrderRows, orderPage])

  const paginatedLowStockRows = useMemo(() => {
    const start = lowStockPage * INVENTORY_PAGE_SIZE
    return lowStockRows.slice(start, start + INVENTORY_PAGE_SIZE)
  }, [lowStockRows, lowStockPage])

  const paginatedStockRows = useMemo(() => {
    const start = stockPage * INVENTORY_PAGE_SIZE
    return stockLeaderRows.slice(start, start + INVENTORY_PAGE_SIZE)
  }, [stockLeaderRows, stockPage])

  useEffect(() => {
    if (customerPage > 0 && customerPage >= customerTotalPages) {
      setCustomerPage(Math.max(customerTotalPages - 1, 0))
    }
  }, [customerPage, customerTotalPages])

  useEffect(() => {
    if (orderPage > 0 && orderPage >= orderTotalPages) {
      setOrderPage(Math.max(orderTotalPages - 1, 0))
    }
  }, [orderPage, orderTotalPages])

  useEffect(() => {
    if (lowStockPage > 0 && lowStockPage >= lowStockTotalPages) {
      setLowStockPage(Math.max(lowStockTotalPages - 1, 0))
    }
  }, [lowStockPage, lowStockTotalPages])

  useEffect(() => {
    if (stockPage > 0 && stockPage >= stockTotalPages) {
      setStockPage(Math.max(stockTotalPages - 1, 0))
    }
  }, [stockPage, stockTotalPages])

  const salesCsv = monthlySales.map((entry) => ({ month: entry.month, revenue: entry.revenue }))
  const customerCsv = customerSpend.map((customer) => ({
    customer: customer.name,
    email: customer.email,
    orders: customer.orders,
    last_order: customer.lastOrder ? customer.lastOrder.toISOString() : null,
    total_spent: customer.total
  }))
  const productRevenueCsv = topProducts.map((product) => ({
    product: product.name,
    slug: product.slug,
    orders: product.orders,
    quantity_kg: product.quantity,
    revenue: product.revenue
  }))

  const sendEmailNow = async () => {
    if (!token) return
    const email = window.prompt('Send sales snapshot to which email address?')
    if (!email) return
    setEmailing(true)
    try {
      await api('/admin/actions/send-sales-report', {
        method: 'POST',
        token,
        body: { email }
      })
      window.alert('Sales report automation is not configured for the local Postgres setup yet.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to queue email.'
      window.alert(message)
    } finally {
      setEmailing(false)
    }
  }

  if (authLoading || initialising) {
    return <Loading message="Preparing analytics…" />
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-primary">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-xl font-semibold">Admin session required</h1>
          <p className="mt-3 text-sm text-primary/70">
            {authError ||
              'Set VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD in your environment to enable automatic dashboard access.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Reports & Insights" subtitle="Production-ready performance overview" />
      <section className="flex-1 space-y-8 bg-background px-4 py-6 sm:px-6">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={TrendingUp}
            label="Total revenue"
            value={currency.format(totalRevenue)}
            helper={`Last 30 days: ${currency.format(last30DaysRevenue)}`}
          />
          <StatCard
            icon={ShoppingCart}
            label="Orders placed"
            value={numberFormatter.format(orderCount)}
            helper={lastOrderDate ? `Most recent: ${dateFormatter.format(lastOrderDate)}` : 'Awaiting first order'}
          />
          <StatCard
            icon={UsersIcon}
            label="Active customers"
            value={numberFormatter.format(uniqueCustomers)}
            helper={`${numberFormatter.format(users.length)} accounts in total`}
          />
          <StatCard
            icon={Repeat}
            label="Returning rate"
            value={`${retentionRate.toFixed(0)}%`}
            helper={`${numberFormatter.format(retention.returning)} returning / ${numberFormatter.format(retention.firstTimers)} new`}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <MetricList
            title="Revenue trend (last 6 months)"
            description="Quick glance at seasonality and month-on-month movement."
            rows={recentMonthlySales}
            emptyMessage="Revenue will appear once orders are recorded."
          />
          <MetricList
            title="Top earning products"
            description="Leader board driven purely by realised revenue."
            rows={topProductRows}
            emptyMessage="Add orders with items to surface product performance."
          />
          <MetricList
            title="Category contribution"
            description="Where income is concentrated across the catalogue."
            rows={categoryRows}
            emptyMessage="Assign categories to products to unlock this view."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TableCard
            title="Customer lifetime value"
            columns={["Customer", 'Orders', 'Lifetime spend', 'Last order']}
            rows={paginatedCustomerRows}
            emptyMessage="We will calculate spend distribution once orders arrive."
            icon={UsersIcon}
            footer={
              customerTotalPages > 1 ? (
                <PaginationControls
                  page={customerPage}
                  totalPages={customerTotalPages}
                  onPageChange={setCustomerPage}
                />
              ) : null
            }
          />
          <TableCard
            title="Latest orders"
            columns={["Reference", 'Placed', 'Items', 'Total']}
            rows={paginatedOrderRows}
            emptyMessage="Recent order activity will be summarised here."
            icon={ShoppingCart}
            footer={
              orderTotalPages > 1 ? (
                <PaginationControls page={orderPage} totalPages={orderTotalPages} onPageChange={setOrderPage} />
              ) : null
            }
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TableCard
            title="Low stock alerts"
            columns={["Product", 'Remaining', 'Category']}
            rows={paginatedLowStockRows}
            emptyMessage="No low stock alerts at the moment."
            icon={AlertTriangle}
            footer={
              lowStockTotalPages > 1 ? (
                <PaginationControls
                  page={lowStockPage}
                  totalPages={lowStockTotalPages}
                  onPageChange={setLowStockPage}
                />
              ) : null
            }
          />
          <TableCard
            title="Highest stock on hand"
            columns={["Product", 'Stock (kg)', 'Category']}
            rows={paginatedStockRows}
            emptyMessage="Create products with stock levels to monitor coverage."
            icon={Package}
            footer={
              stockTotalPages > 1 ? (
                <PaginationControls page={stockPage} totalPages={stockTotalPages} onPageChange={setStockPage} />
              ) : null
            }
          />
        </div>

  <div className="rounded-3xl border border-secondary/20 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-secondary">Data exports & automation</h3>
              <p className="mt-2 text-xs text-primary/60">
                Download raw datasets for deeper analysis or trigger scheduled snapshots once email automation is ready.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => exportToCsv('monthly_sales.csv', salesCsv)}
                className="inline-flex items-center gap-2 rounded-full border border-secondary px-4 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary hover:text-background"
              >
                <Download size={14} /> Sales summary
              </button>
              <button
                onClick={() => exportToCsv('customer_lifetime_value.csv', customerCsv)}
                className="inline-flex items-center gap-2 rounded-full border border-secondary px-4 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary hover:text-background"
              >
                <Download size={14} /> Customer lifetime value
              </button>
              <button
                onClick={() => exportToCsv('product_revenue.csv', productRevenueCsv)}
                className="inline-flex items-center gap-2 rounded-full border border-secondary px-4 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary hover:text-background"
              >
                <Download size={14} /> Product revenue
              </button>
              <button
                onClick={sendEmailNow}
                disabled={emailing}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-background transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Mail size={14} /> {emailing ? 'Emailing…' : 'Send snapshot'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
