'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import useSWR, { type Fetcher } from 'swr'

import CategoryPills from '@/components/CategoryPills'
import { NextDeliveryCard } from '@/components/NextDeliveryCard'
import { buildApiUrl } from '@/lib/api'
import { getToken } from '@/lib/auth'
import type { Category, NextDeliveryInfo, Order } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'
import logoImage from '@/images/logo.png'

type FetchOptions = {
  headers?: Record<string, string>
}

async function fetchJson<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const res = await fetch(buildApiUrl(path), {
    cache: 'no-store',
    headers: {
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || 'Failed to load data')
  }
  return (await res.json()) as T
}

export default function AccountOverviewPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const ordersFetcher: Fetcher<Order[], string> = async (path) => {
    const token = getToken()
    if (!token) {
      throw new Error('Your session has expired. Please sign in again.')
    }
    return fetchJson<Order[]>(path, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  const {
    data: ordersData,
    error: ordersError,
    isLoading: ordersLoading,
  } = useSWR<Order[]>(user ? '/orders/my' : null, ordersFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const deliveryFetcher: Fetcher<NextDeliveryInfo, string> = (path) => fetchJson<NextDeliveryInfo>(path)

  const {
    data: nextDelivery,
    isLoading: nextDeliveryLoading,
    error: nextDeliveryError,
  } = useSWR<NextDeliveryInfo>(user ? '/site/next-delivery' : null, deliveryFetcher, {
    refreshInterval: 15 * 60 * 1000,
    revalidateOnFocus: false,
  })

  const categoryFetcher: Fetcher<Category[], string> = (path) => fetchJson<Category[]>(path)

  const {
    data: categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useSWR<Category[]>(user ? '/categories/' : null, categoryFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const orders = ordersData ?? []
  const orderErrorMessage = ordersError instanceof Error ? ordersError.message : ordersError ?? null

  const lifetimeSpend = useMemo(
    () => orders.reduce((sum, order) => sum + order.total_amount, 0),
    [orders],
  )
  const activeOrders = useMemo(
    () => orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)),
    [orders],
  )
  const recentOrder = orders[0] ?? null

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value)

  const formatStatus = (status: string) =>
    status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

  const handleSelectCategory = (slug: string) => {
    if (slug === 'all') {
      router.push('/categories')
      return
    }
    router.push(`/categories?slug=${slug}`)
  }

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-r from-brand-dark via-brand-olive to-brand-dark/80 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70">
            Welcome back
          </span>
          <Image
            src={logoImage}
            alt="Tarel logo"
            width={112}
            height={40}
            className="h-10 w-auto drop-shadow-lg"
            priority
          />
        </div>
        <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
          {user?.name ? `Nice to see you, ${user.name.split(' ')[0]}!` : 'Your Tarel dashboard'}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80">
          Track your upcoming deliveries, review recent orders, and jump straight back to the menu when you&apos;re ready.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href="/user/orders"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 font-medium text-white transition hover:border-white hover:bg-white/10"
          >
            View orders
          </Link>
          <Link
            href="/categories"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 font-medium text-white/90 transition hover:border-white hover:bg-white/10"
          >
            Shop the menu
          </Link>
          <Link
            href="/user/profile"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 font-medium text-white/90 transition hover:border-white hover:bg-white/10"
          >
            Update profile
          </Link>
        </div>
      </section>

  <section className="rounded-3xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
        {categoriesLoading ? (
          <div className="h-24 animate-pulse rounded-2xl bg-brand-beige/40" />
        ) : categoriesError ? (
          <p className="text-sm text-red-600">Unable to load categories.</p>
        ) : categories && categories.length > 0 ? (
          <CategoryPills categories={categories} onSelect={handleSelectCategory} />
        ) : (
          <p className="text-sm text-brand-dark/60">No categories available yet.</p>
        )}
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-semibold text-brand-dark">Account snapshot</h2>
          <p className="text-sm text-brand-dark/60">A quick look at your recent activity.</p>
        </header>
        {authLoading || ordersLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-3xl bg-white/70" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Orders placed" value={orders.length.toString()} detail={orders.length === 1 ? 'Single order so far' : `${orders.length} total orders`} />
            <StatCard
              label="Active orders"
              value={activeOrders.length.toString()}
              detail={activeOrders.length ? 'In-progress deliveries en route' : 'No active orders right now'}
            />
            <StatCard
              label="Lifetime spend"
              value={formatCurrency(lifetimeSpend)}
              detail={orders.length ? 'Across all delivered orders' : 'Place an order to start tracking'}
            />
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <article className="rounded-3xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-brand-dark">Most recent order</h3>
              <p className="text-sm text-brand-dark/60">Catch the essentials at a glance.</p>
            </div>
            <Link href="/user/orders" className="text-sm font-medium text-brand-dark hover:underline">
              View all orders →
            </Link>
          </header>

          <div className="mt-5">
            {ordersLoading ? (
              <div className="space-y-4">
                <div className="h-20 animate-pulse rounded-2xl bg-brand-beige/40" />
                <div className="h-12 animate-pulse rounded-2xl bg-brand-beige/30" />
              </div>
            ) : orderErrorMessage ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {orderErrorMessage}
              </div>
            ) : !recentOrder ? (
              <div className="rounded-2xl border border-dashed border-brand-dark/20 bg-white p-6 text-center text-brand-dark/70 sm:p-8">
                <p className="text-sm font-medium">No orders yet.</p>
                <p className="mt-2 text-sm">Browse the freshest catch and place your first order.</p>
                <Link
                  href="/categories"
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-brand-dark px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow transition hover:opacity-90"
                >
                  Explore products
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-brand-dark/10 bg-brand-beige/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-brand-dark/50">Order</p>
                      <h4 className="text-xl font-semibold text-brand-dark">#{recentOrder.id.slice(0, 8).toUpperCase()}</h4>
                    </div>
                    <span className="rounded-full bg-brand-dark px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white">
                      {formatStatus(recentOrder.status)}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-4 text-sm text-brand-dark/80 md:grid-cols-3">
                    <div>
                      <dt className="font-semibold text-brand-dark">Placed</dt>
                      <dd>{new Date(recentOrder.created_at).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-brand-dark">Delivery window</dt>
                      <dd>{recentOrder.delivery_slot ?? 'Assigned closer to dispatch'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-brand-dark">Total</dt>
                      <dd>{formatCurrency(recentOrder.total_amount)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-2xl border border-brand-dark/10 bg-white p-4">
                  <h5 className="text-sm font-semibold text-brand-dark">Line items</h5>
                  <ul className="mt-3 space-y-3 text-sm text-brand-dark/80">
                    {recentOrder.items.map((item, index) => {
                      const lineTotal = item.qty_kg * item.price_per_kg
                      return (
                        <li
                          key={`${recentOrder.id}-${item.product_id}-${index}`}
                          className="flex items-start justify-between gap-3"
                        >
                          <div>
                            <p className="font-semibold text-brand-dark">{item.product.name}</p>
                            <p className="text-xs text-brand-dark/60">
                              {item.qty_kg.toFixed(2)} kg × £{item.price_per_kg.toFixed(2)}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-brand-dark">{formatCurrency(lineTotal)}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </article>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-brand-dark/10 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
            <h3 className="text-lg font-semibold text-brand-dark">Next delivery</h3>
            <p className="mt-1 text-sm text-brand-dark/60">Stay up to date with the next drop-off window.</p>
            <div className="mt-4">
              {nextDeliveryLoading ? (
                <div className="h-40 animate-pulse rounded-2xl bg-brand-beige/40" />
              ) : nextDeliveryError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  Failed to load delivery schedule. Please refresh.
                </div>
              ) : (
                <NextDeliveryCard
                  nextDelivery={nextDelivery ?? null}
                  showWindowLabel
                  windowLabelPlacement="belowCountdown"
                />
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-brand-dark/10 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="text-lg font-semibold text-brand-dark">Need a hand?</h3>
            <p className="mt-2 text-sm text-brand-dark/70">
              Have a question about delivery or your orders? Drop our support team a note and we&apos;ll jump in quickly.
            </p>
            <Link
              href="/support"
              className="mt-4 inline-flex items-center justify-center rounded-full border border-brand-dark/20 px-4 py-2 text-sm font-medium text-brand-dark transition hover:border-brand-dark hover:bg-brand-dark hover:text-white"
            >
              Contact support
            </Link>
          </div>
        </aside>
      </section>
    </div>
  )
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-brand-dark/10 bg-white p-4 text-brand-dark shadow-sm sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-dark/50">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-brand-dark/60">{detail}</p>
    </div>
  )
}
