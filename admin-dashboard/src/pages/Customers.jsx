import { useCallback, useEffect, useMemo, useState } from 'react'

import Header from '../components/Header'
import Loading from '../components/Loading'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

const currency = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP'
})

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short'
})

const SORT_OPTIONS = [
  { value: 'recent_order', label: 'Sort by most recent order' },
  { value: 'name_asc', label: 'Sort by name (A–Z)' },
  { value: 'name_desc', label: 'Sort by name (Z–A)' },
  { value: 'order_count', label: 'Sort by order count' },
  { value: 'total_spend', label: 'Sort by total spend' }
]

const PAGE_SIZE_OPTIONS = [25, 50, 100]
const ORDER_PAGE_SIZE = 10

export default function Customers() {
  const { token, loading: authLoading, error: authError } = useAuth()

  const [customers, setCustomers] = useState([])
  const [metrics, setMetrics] = useState({ total_customers: 0, total_orders: 0, total_revenue: 0 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 })
  const [sortOption, setSortOption] = useState('recent_order')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [initialising, setInitialising] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')

  const [selectedId, setSelectedId] = useState('')
  const [orderPage, setOrderPage] = useState(1)
  const [detailCache, setDetailCache] = useState({})

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchCustomers = useCallback(async (nextPage, nextPageSize, sort, query) => {
    if (!token) return null
    const params = new URLSearchParams({
      page: String(nextPage),
      page_size: String(nextPageSize),
      sort: sort || 'recent_order'
    })
    if (query) {
      params.set('search', query)
    }
    return api(`/admin/customers?${params.toString()}`, { token })
  }, [token])

  useEffect(() => {
    if (!token) return

    let cancelled = false
    setListLoading(true)
    setError('')

    const load = async () => {
      try {
        const data = await fetchCustomers(page, pageSize, sortOption, debouncedSearch)
        if (cancelled || !data) return

        const {
          items = [],
          metrics: incomingMetrics = {},
          total = 0,
          page: responsePage = page,
          page_size: responsePageSize = pageSize,
          total_pages: totalPages = 0
        } = data

        setCustomers(items)
        setMetrics({
          total_customers: incomingMetrics.total_customers ?? 0,
          total_orders: incomingMetrics.total_orders ?? 0,
          total_revenue: incomingMetrics.total_revenue ?? 0
        })
        setPagination({ total, totalPages })

        if (responsePage !== page) {
          setPage(responsePage)
        }
        if (responsePageSize !== pageSize) {
          setPageSize(responsePageSize)
        }

        setSelectedId((previous) => {
          if (previous && items.some((customer) => customer.id === previous)) {
            return previous
          }
          return items[0]?.id || ''
        })
        setOrderPage(1)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load customers', err)
          const message = err instanceof Error ? err.message : 'Unable to load customers.'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setListLoading(false)
          setInitialising(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [token, page, pageSize, sortOption, debouncedSearch, fetchCustomers])

  const fetchCustomerDetail = useCallback(async (customerId, nextOrderPage) => {
    if (!token || !customerId) return null
    const params = new URLSearchParams({
      order_page: String(nextOrderPage),
      order_page_size: String(ORDER_PAGE_SIZE)
    })
    return api(`/admin/customers/${customerId}?${params.toString()}`, { token })
  }, [token])

  useEffect(() => {
    if (!selectedId) return

    const cached = detailCache[selectedId]?.ordersByPage?.[orderPage]
    if (cached) {
      return
    }

    let cancelled = false
    setDetailLoading(true)

    const loadDetail = async () => {
      try {
        const detail = await fetchCustomerDetail(selectedId, orderPage)
        if (cancelled || !detail) return

        setDetailCache((prev) => {
          const current = prev[selectedId] || { customer: detail.customer, ordersByPage: {} }
          return {
            ...prev,
            [selectedId]: {
              customer: detail.customer,
              ordersByPage: {
                ...current.ordersByPage,
                [detail.orders.page]: detail.orders
              }
            }
          }
        })

        if (detail.orders.page !== orderPage) {
          setOrderPage(detail.orders.page)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load customer detail', err)
          setError((previous) => previous || 'Unable to load customer details.')
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false)
        }
      }
    }

    loadDetail()

    return () => {
      cancelled = true
    }
  }, [selectedId, orderPage, detailCache, fetchCustomerDetail])

  const totalCustomers = metrics.total_customers ?? 0
  const totalOrders = metrics.total_orders ?? 0
  const totalRevenue = metrics.total_revenue ?? 0

  const selectedDetail = selectedId ? detailCache[selectedId] : null
  const selectedCustomer = useMemo(() => {
    if (selectedDetail) return selectedDetail.customer
    return customers.find((customer) => customer.id === selectedId) || null
  }, [customers, selectedDetail, selectedId])

  const ordersPageData = selectedDetail?.ordersByPage?.[orderPage]

  if (authLoading || initialising) {
    return <Loading message="Loading customers…" />
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
      <Header title="Customers" subtitle="Understand customer value and order history" />
      <section className="flex-1 space-y-6 bg-background px-4 py-6 sm:px-6">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total customers" value={totalCustomers} helper={null} />
          <StatCard label="Orders recorded" value={totalOrders} helper={null} />
          <StatCard label="Lifetime value" value={currency.format(totalRevenue)} helper={null} />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 rounded-3xl border border-secondary/20 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-primary/70">Select a customer to analyse their order history.</p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="search"
                  placeholder="Search by name or email"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-48 rounded-full border border-secondary/40 px-4 py-2 text-xs font-semibold text-secondary outline-none transition focus:border-secondary"
                />
                <select
                  value={sortOption}
                  onChange={(event) => {
                    setSortOption(event.target.value)
                    setPage(1)
                  }}
                  className="rounded-full border border-secondary/40 px-4 py-2 text-xs font-semibold text-secondary outline-none transition focus:border-secondary"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value))
                    setPage(1)
                  }}
                  className="rounded-full border border-secondary/40 px-4 py-2 text-xs font-semibold text-secondary outline-none transition focus:border-secondary"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} per page
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-secondary/20">
              <table className="min-w-[640px] divide-y divide-secondary/10 text-left text-sm text-primary/80">
                <thead className="bg-background text-primary">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Orders</th>
                    <th className="px-4 py-3 font-semibold">Lifetime value</th>
                    <th className="px-4 py-3 font-semibold">Last order</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => {
                    const isActive = customer.id === selectedId
                    return (
                      <tr
                        key={customer.id}
                        onClick={() => {
                          setSelectedId(customer.id)
                          setOrderPage(1)
                        }}
                        className={`cursor-pointer border-t border-secondary/10 transition hover:bg-secondary/10 ${
                          isActive ? 'bg-secondary/15 text-primary' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-primary">{customer.name}</p>
                          <p className="text-xs text-primary/60">{customer.email}</p>
                          {customer.created_at && (
                            <p className="text-[11px] text-primary/40">
                              Joined {dateFormatter.format(new Date(customer.created_at))}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-primary/80">{customer.order_count}</td>
                        <td className="px-4 py-3 text-primary">{currency.format(customer.total_spend)}</td>
                        <td className="px-4 py-3 text-primary/70">
                          {customer.last_order_at ? dateFormatter.format(new Date(customer.last_order_at)) : 'No orders yet'}
                        </td>
                      </tr>
                    )
                  })}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-secondary">
                        {listLoading ? 'Loading customers…' : 'No customers found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-primary/60">
              <span>
                Showing {customers.length === 0 ? 0 : (page - 1) * pageSize + 1}-{(page - 1) * pageSize + customers.length} of {pagination.total}
              </span>
              <PaginationControls
                page={page}
                totalPages={pagination.totalPages}
                disabled={listLoading}
                onPageChange={(nextPage) => setPage(nextPage)}
              />
            </div>
          </div>

          <aside className="w-full max-w-xl rounded-3xl border border-secondary/20 bg-white p-6 shadow-sm lg:w-96">
            {selectedCustomer ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">Customer</p>
                  <h2 className="text-2xl font-semibold text-primary">{selectedCustomer.name}</h2>
                  <p className="text-sm text-primary/70">{selectedCustomer.email}</p>
                </div>

                <div className="grid gap-3 rounded-2xl bg-background/60 p-4 text-sm text-primary/80">
                  <MetricRow label="Orders placed" value={selectedCustomer.order_count ?? selectedCustomer.orderCount ?? 0} />
                  <MetricRow label="Lifetime value" value={currency.format(selectedCustomer.total_spend ?? selectedCustomer.totalSpend ?? 0)} />
                  <MetricRow
                    label="Last order"
                    value={selectedCustomer.last_order_at || selectedCustomer.lastOrderAt
                      ? dateFormatter.format(new Date(selectedCustomer.last_order_at || selectedCustomer.lastOrderAt))
                      : 'No orders yet'}
                  />
                </div>

                <div className="space-y-3">
                  <p className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-secondary">
                    <span>Order timeline</span>
                    {ordersPageData && ordersPageData.total > 0 && (
                      <span className="text-[10px] font-medium tracking-[0.2em] text-primary/60">
                        Page {ordersPageData.page} of {Math.max(ordersPageData.total_pages, 1)}
                      </span>
                    )}
                  </p>

                  {detailLoading && !ordersPageData ? (
                    <p className="rounded-2xl border border-dashed border-secondary/30 bg-background/40 px-4 py-5 text-center text-xs text-primary/60">
                      Loading order history…
                    </p>
                  ) : ordersPageData && ordersPageData.items.length > 0 ? (
                    <ul className="space-y-4 text-sm text-primary/80">
                      {ordersPageData.items.map((order) => {
                        const items = Array.isArray(order.items) ? order.items : []
                        const orderTotal = Number(order.total_amount ?? 0)
                        return (
                          <li key={order.id} className="space-y-3 rounded-2xl border border-secondary/20 px-4 py-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Order</p>
                                <p className="font-semibold text-primary">#{order.id.slice(0, 12)}</p>
                                <p className="text-xs text-primary/60">
                                  {order.created_at
                                    ? dateFormatter.format(new Date(order.created_at))
                                    : 'Unknown date'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs uppercase tracking-[0.3em] text-secondary">Status</p>
                                <p className="text-xs font-semibold uppercase tracking-widest text-primary/60">
                                  {String(order.status || '').replace(/_/g, ' ')}
                                </p>
                                <p className="mt-2 text-sm font-semibold text-primary">{currency.format(orderTotal)}</p>
                              </div>
                            </div>

                            <div className="grid gap-2 rounded-2xl bg-background/50 p-3 text-xs text-primary/70">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-primary/80">Delivery window</span>
                                <span>{order.delivery_slot || 'Not specified'}</span>
                              </div>
                              <div>
                                <p className="font-semibold text-primary/80">Delivery address</p>
                                <p>
                                  {order.address_line}
                                  {order.city || order.postcode ? (
                                    <>
                                      <br />
                                      {[order.city, order.postcode].filter(Boolean).join(', ')}
                                    </>
                                  ) : null}
                                </p>
                              </div>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-secondary/20">
                              <table className="min-w-[520px] text-left text-xs text-primary/80">
                                <thead className="bg-background text-primary/70">
                                  <tr>
                                    <th className="px-3 py-2 font-semibold">Product</th>
                                    <th className="px-3 py-2 text-right font-semibold">Qty (kg)</th>
                                    <th className="px-3 py-2 text-right font-semibold">Price / kg</th>
                                    <th className="px-3 py-2 text-right font-semibold">Line total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.length === 0 ? (
                                    <tr>
                                      <td colSpan={4} className="px-3 py-3 text-center text-xs text-primary/50">
                                        No product lines recorded.
                                      </td>
                                    </tr>
                                  ) : (
                                    items.map((item) => {
                                      const qty = Number(item.qty_kg ?? 0)
                                      const price = Number(item.price_per_kg ?? 0)
                                      const lineTotal = qty * price
                                      return (
                                        <tr key={item.id} className="border-t border-secondary/15">
                                          <td className="px-3 py-2">
                                            <p className="font-medium text-primary">{item.product?.name || 'Unknown product'}</p>
                                            <p className="text-[10px] uppercase tracking-widest text-primary/50">
                                              {item.product?.slug || 'n/a'}
                                            </p>
                                          </td>
                                          <td className="px-3 py-2 text-right">{qty.toFixed(2)}</td>
                                          <td className="px-3 py-2 text-right">{currency.format(price)}</td>
                                          <td className="px-3 py-2 text-right">{currency.format(lineTotal)}</td>
                                        </tr>
                                      )
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-primary/60">
                              <span>{items.length} item{items.length === 1 ? '' : 's'} total</span>
                              <span>Order total {currency.format(orderTotal)}</span>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-secondary/30 bg-background/40 px-4 py-5 text-center text-xs text-primary/60">
                      This customer has not placed any orders yet.
                    </p>
                  )}

                  {ordersPageData && ordersPageData.total_pages > 1 && (
                    <PaginationControls
                      page={ordersPageData.page}
                      totalPages={ordersPageData.total_pages}
                      disabled={detailLoading}
                      onPageChange={(next) => {
                        setOrderPage(next)
                      }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-primary/60">
                Select a customer to see their details.
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, helper }) {
  return (
    <div className="rounded-3xl border border-secondary/20 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-secondary">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-primary">{value}</p>
      {helper && <p className="mt-1 text-xs text-primary/60">{helper}</p>}
    </div>
  )
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-primary/60">{label}</span>
      <span className="font-semibold text-primary">{value}</span>
    </div>
  )
}

function PaginationControls({ page, totalPages, onPageChange, disabled }) {
  if (!totalPages || totalPages <= 1) return null

  const goTo = (nextPage) => {
    if (nextPage === page) return
    if (nextPage < 1 || nextPage > totalPages) return
    onPageChange(nextPage)
  }

  return (
    <div className="flex items-center gap-2 text-xs text-primary/70">
      <button
        type="button"
        onClick={() => goTo(page - 1)}
        disabled={page <= 1 || disabled}
        className="rounded-full border border-secondary/30 px-3 py-1 font-semibold transition hover:bg-secondary hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <span className="font-semibold text-primary/60">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages || disabled}
        className="rounded-full border border-secondary/30 px-3 py-1 font-semibold transition hover:bg-secondary hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  )
}
