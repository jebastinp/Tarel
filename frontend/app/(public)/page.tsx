'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo } from 'react'
import useSWR from 'swr'

import { NextDeliveryCard } from '@/components/NextDeliveryCard'
import { buildApiUrl } from '@/lib/api'
import type { Category, NextDeliveryInfo, Product } from '@/lib/types'
import { useAuth } from '@/providers/AuthProvider'
import logoImage from '@/images/logo.png'

const fetcher = (path: string) => fetch(buildApiUrl(path)).then((res) => res.json())

const CATEGORY_COPY: Record<string, { title: string; description: string }> = {
  'fresh-fish': {
    title: 'Fresh Fish Market',
    description: 'Line-caught favourites filleted on order and delivered in ice-packed boxes.',
  },
  'dry-fish': {
    title: 'Dry Fish Pantry',
    description: 'Authentic sun-dried staples perfect for poriyal, thokku, and stews.',
  },
  combo: {
    title: 'Combo Offers',
    description: 'Chef-curated bundles ready to anchor your family dinners.',
  },
}

export default function Home() {
  const { user } = useAuth()
  
  const {
    data: products,
    isLoading: loadingProducts,
    error: productsError,
  } = useSWR<Product[]>('/products/', fetcher)

  const { data: categories } = useSWR<Category[]>('/categories/', fetcher)

  const {
    data: nextDelivery,
    isLoading: nextDeliveryLoading,
    error: nextDeliveryError,
  } = useSWR<NextDeliveryInfo>('/site/next-delivery', fetcher, {
    refreshInterval: 15 * 60 * 1000,
  })

  const featuredProducts = useMemo(() => {
    if (!products || !products.length) return []
    return [...products]
      .sort((a, b) => b.stock_kg - a.stock_kg)
      .slice(0, 3)
  }, [products])

  const categoryShowcase = useMemo(() => {
    if (!products || !products.length) return []
    const summary = new Map<string, { category: Category; count: number }>()
    for (const product of products) {
      const key = product.category.slug
      if (!summary.has(key)) {
        summary.set(key, { category: product.category, count: 0 })
      }
      summary.get(key)!.count += 1
    }
    return Array.from(summary.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }, [products])

  const fallbackCategories = useMemo(() => {
    if (!categories) return []
    return categories.slice(0, 3).map((category) => ({
      category,
      count:
        products?.filter((product) => product.category.slug === category.slug).length ?? 0,
    }))
  }, [categories, products])

  const featuredState = () => {
    if (loadingProducts) {
      return (
        <div className="space-y-3 text-sm text-brand-dark/70">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between rounded-2xl border border-brand-dark/10 p-3">
              <div className="space-y-2">
                <div className="h-3 w-36 animate-pulse rounded bg-brand-beige/80" />
                <div className="h-3 w-48 animate-pulse rounded bg-brand-beige/60" />
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-brand-beige/70" />
            </div>
          ))}
        </div>
      )
    }

    if (productsError) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          We couldn&apos;t load today&apos;s highlights. Please refresh the page.
        </div>
      )
    }

    if (!featuredProducts.length) {
      return (
        <div className="rounded-2xl border border-brand-dark/10 bg-brand-beige/30 p-4 text-sm text-brand-dark/70">
          Fresh stock is arriving shortly. Check back in a moment!
        </div>
      )
    }

    return (
      <div className="space-y-3 text-sm text-brand-dark/70">
        {featuredProducts.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between rounded-2xl border border-brand-dark/10 p-3"
          >
            <div>
              <p className="font-semibold text-brand-dark">{product.name}</p>
              <p>
                {product.category.name}
                {product.description ? ` • ${product.description.slice(0, 60)}${product.description.length > 60 ? '…' : ''}` : ''}
              </p>
            </div>
            <span className="rounded-full bg-brand-dark px-3 py-1 text-xs font-semibold text-white">
              £{product.price_per_kg.toFixed(2)} / kg
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-12 px-4 sm:px-6 lg:px-8">
      <section className="rounded-[40px] bg-gradient-to-br from-brand-beige via-white to-brand-olive/20 p-8 shadow-xl md:p-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-12">
          <header className="flex flex-col items-center gap-4 text-center">
            <Image
              src={logoImage}
              alt="Tarel logo"
              width={248}
              height={82}
              className="h-20 w-auto drop-shadow-lg md:h-24"
              priority
            />
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-dark/70 sm:text-sm">
              Welcome to Tarel
            </span>
            <h1 className="text-4xl font-bold leading-tight text-brand-dark md:text-6xl">
              Edinburgh&apos;s trusted seafood market — delivered to your doorstep
            </h1>
            <p className="max-w-2xl text-base text-brand-dark/70 md:text-lg">
              Daily catches from Newhaven pier, filleted to your order and couriered across the city in chilled packs. Fresh, reliable, and ready for supper.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/categories"
                className="inline-flex items-center justify-center rounded-full bg-brand-dark px-7 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
              >
                Browse the menu
              </Link>
              {!user && (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-brand-dark/30 px-7 py-3 text-sm font-semibold text-brand-dark transition hover:border-brand-dark hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
                >
                  Log in / Sign up
                </Link>
              )}
            </div>
          </header>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="relative overflow-hidden rounded-3xl border border-brand-dark/10 bg-white/95 p-6 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-brand-dark">Today&apos;s highlights</h2>
                  <p className="text-sm text-brand-dark/60">Sustainably sourced favourites flying out of the crates this morning.</p>
                </div>
                <Link href="/categories" className="hidden text-sm font-medium text-brand-dark/70 transition hover:text-brand-dark md:inline-block">
                  See all →
                </Link>
              </div>
              <div className="mt-5">{featuredState()}</div>
              <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-brand-olive/20" />
              <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-brand-dark/10" />
            </div>

            <div className="rounded-3xl border border-brand-dark/10 bg-white/95 p-6 shadow-lg backdrop-blur">
              <h2 className="text-xl font-semibold text-brand-dark">Next delivery</h2>
              <p className="mt-2 text-sm text-brand-dark/60">We update this every few minutes so you know exactly when to expect your box.</p>
              <div className="mt-6">
                {nextDeliveryLoading ? (
                  <div className="h-44 animate-pulse rounded-2xl bg-brand-beige/40" />
                ) : nextDeliveryError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    We couldn&apos;t fetch the delivery schedule. Please refresh shortly.
                  </div>
                ) : (
                  <NextDeliveryCard nextDelivery={nextDelivery ?? null} />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-[32px] border border-brand-dark/10 bg-white/90 p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-dark/50">From the market</span>
            <h2 className="mt-2 text-3xl font-semibold text-brand-dark">A tasting tour of the coast</h2>
            <p className="mt-2 max-w-2xl text-sm text-brand-dark/60">
              Discover what fellow Edinburgh families are ordering most this week and book your favourites before the afternoon rush.
            </p>
          </div>
          <Link href="/categories" className="text-sm font-medium text-brand-dark transition hover:opacity-80">
            Browse all categories →
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
          {(categoryShowcase.length ? categoryShowcase : fallbackCategories).map(({ category, count }) => {
            const copy = CATEGORY_COPY[category.slug] ?? {
              title: category.name,
              description: `${count ?? 0} catch${(count ?? 0) === 1 ? '' : 'es'} ready to order.`,
            }
            return (
              <FeatureCard
                key={category.slug}
                title={copy.title}
                description={copy.description}
                href={`/categories?slug=${category.slug}`}
                count={count}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}

function FeatureCard({
  title,
  description,
  href,
  count,
}: {
  title: string
  description: string
  href: string
  count?: number
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col justify-between rounded-3xl border border-brand-dark/10 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-olive/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-dark">
          Curated
          {typeof count === 'number' && count > 0 && (
            <span className="rounded-full bg-brand-dark px-2 py-0.5 text-[10px] font-semibold text-white">
              {count} items
            </span>
          )}
        </span>
        <h3 className="text-xl font-semibold text-brand-dark">{title}</h3>
        <p className="text-sm text-brand-dark/70">{description}</p>
      </div>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-dark">
        Explore
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </span>
    </Link>
  )
}
