'use client'

import { Suspense, useMemo } from 'react'
import useSWR from 'swr'
import { useRouter, useSearchParams } from 'next/navigation'

import CategoryPills from '@/components/CategoryPills'
import { NextDeliveryCard } from '@/components/NextDeliveryCard'
import ProductCard from '@/components/ProductCard'
import { buildApiUrl } from '@/lib/api'
import type { Category, NextDeliveryInfo, Product } from '@/lib/types'

const fetcher = (path: string) => fetch(buildApiUrl(path)).then((res) => res.json())

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesSkeleton />}>
      <CategoriesContent />
    </Suspense>
  )
}

function CategoriesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams?.get('slug') || 'all'
  const rawSearch = searchParams?.get('q') ?? ''
  const searchTerm = rawSearch.trim().toLowerCase()

  const {
    data: categories,
    isLoading: loadingCategories,
  } = useSWR<Category[]>('/categories/', fetcher)
  const { data: products, isLoading: loadingProducts } = useSWR<Product[]>('/products/', fetcher)
  const { data: nextDelivery } = useSWR<NextDeliveryInfo>('/site/next-delivery', fetcher, {
    refreshInterval: 15 * 60 * 1000,
  })

  const filteredProducts = useMemo<Product[]>(() => {
    if (!products) return []

    return products.filter((product) => {
      const matchesCategory = slug === 'all' || product?.category?.slug === slug
      if (!matchesCategory) return false

      if (!searchTerm) return true

      const haystack = `${product?.name ?? ''} ${product?.description ?? ''}`.toLowerCase()
      return haystack.includes(searchTerm)
    })
  }, [products, searchTerm, slug])

  const handleSelectCategory = (nextSlug: string) => {
    const params = new URLSearchParams()

    if (nextSlug !== 'all') {
      params.set('slug', nextSlug)
    }

    if (rawSearch.trim()) {
      params.set('q', rawSearch.trim())
    }

    const target = params.toString()
    router.push(`/categories${target ? `?${target}` : ''}`)
  }

  const activeCategoryName = useMemo(() => {
    const matched = categories?.find((cat) => cat.slug === slug)
    const baseName = slug === 'all' ? 'All products' : matched ? matched.name : 'Category'
    const trimmed = rawSearch.trim()

    return trimmed ? `${baseName} — “${trimmed}”` : baseName
  }, [categories, rawSearch, slug])

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-3xl bg-gradient-to-r from-brand-beige to-white p-6 md:p-10 shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-brand-dark/60">Seafood marketplace</p>
          <div className="mt-4 space-y-4 lg:max-w-2xl">
            <h1 className="text-3xl font-bold text-brand-dark md:text-4xl">
              Taste Edinburgh&apos;s freshest catch
            </h1>
            <p className="text-base text-brand-dark/70">
              Handpicked wet-market favourites, authentic dry fish and meal-ready specials. Choose a
              category below and add your preferred cut in a single tap.
            </p>
          </div>
        </section>

        <aside className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-dark/60">Next delivery</h2>
          <div className="mt-4">
            <NextDeliveryCard nextDelivery={nextDelivery} className="w-full" />
          </div>
        </aside>
      </div>

      {loadingCategories ? (
        <div className="animate-pulse rounded-3xl bg-brand-beige/60 p-6 text-sm text-brand-dark/50">
          Loading categories...
        </div>
      ) : categories ? (
        <CategoryPills
          categories={categories}
          selected={slug}
          onSelect={handleSelectCategory}
        />
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-brand-dark">{activeCategoryName}</h2>
            <p className="text-sm text-brand-dark/60">
              {filteredProducts.length} item{filteredProducts.length === 1 ? '' : 's'} curated for you
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-brand-dark/60">
            <span className="inline-flex h-3 w-3 rounded-full bg-brand-olive" />
            Ready for same-day dispatch
          </div>
        </div>

        {loadingProducts ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-72 animate-pulse rounded-3xl bg-brand-beige/60" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-brand-dark/20 p-10 text-center text-brand-dark/60">
            {rawSearch.trim()
              ? `We couldn’t find any matches for “${rawSearch.trim()}”. Try adjusting your search terms.`
              : 'Nothing to show yet. Check back soon for new arrivals.'}
          </div>
        )}
      </section>
    </div>
  )
}

function CategoriesSkeleton() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-brand-beige to-white p-6 md:p-10 shadow-sm">
        <div className="h-40 animate-pulse rounded-2xl bg-white/50" />
      </section>
      <div className="h-12 animate-pulse rounded-full bg-brand-beige/70" />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-3xl bg-brand-beige/60" />
        ))}
      </div>
    </div>
  )
}
