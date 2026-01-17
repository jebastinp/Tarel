'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import { useCart } from '@/providers/CartProvider'
import { buildMediaUrl } from '@/lib/api'

const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
const SHIPPING_THRESHOLD = 50
const SHIPPING_FEE = 4.5
const VAT_RATE = 0.05
const QTY_STEP = 0.5

export default function CartPage() {
  const { items, update, remove, total } = useCart()

  const subtotal = total
  const deliveryFee = useMemo(() => {
    if (!items.length) return 0
    return subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
  }, [items.length, subtotal])

  const estimatedTax = useMemo(() => subtotal * VAT_RATE, [subtotal])
  const grandTotal = useMemo(() => subtotal + deliveryFee + estimatedTax, [subtotal, deliveryFee, estimatedTax])
  const totalWeight = useMemo(
    () => items.reduce((sum, line) => sum + line.qty_kg, 0),
    [items],
  )

  const hasItems = items.length > 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-10 space-y-2 text-brand-dark">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-dark/60">Your basket</p>
        <h1 className="text-3xl font-semibold">Review your sustainably sourced seafood</h1>
        <p className="text-sm text-brand-dark/70">
          Adjust quantities, clarify your delivery preferences, and double-check the day&apos;s catch before heading to checkout.
        </p>
      </header>

      {!hasItems && (
        <div className="card space-y-4 text-center text-brand-dark">
          <p className="text-lg font-medium">Your cart is feeling a little light!</p>
          <p className="text-sm text-brand-dark/70">
            Explore today&apos;s specials and add your favourite seafood to begin crafting your order.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/products" className="btn inline-flex items-center gap-2">
              Browse products
            </Link>
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-dark/10 px-4 py-2 text-sm font-semibold text-brand-dark transition hover:border-brand-dark/40 hover:bg-brand-dark hover:text-white"
            >
              Discover categories
            </Link>
          </div>
        </div>
      )}

      {hasItems && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="space-y-6">
            {items.map((line, lineIndex) => {
              const lineTotal = line.qty_kg * line.product.price_per_kg
              return (
                <article
                  key={`${line.product.id}-${lineIndex}`}
                  className="card flex flex-col gap-5 p-5 text-brand-dark sm:flex-row sm:items-center"
                >
                  <div className="h-28 w-full overflow-hidden rounded-2xl bg-brand-beige/60 sm:h-32 sm:w-32">
                    {line.product.image_url ? (
                      <img
                        src={buildMediaUrl(line.product.image_url)}
                        alt={line.product.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-brand-beige/80 text-lg font-semibold text-brand-dark/70">
                        {line.product.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-brand-dark">{line.product.name}</h2>
                      <p className="text-sm text-brand-dark/60">{line.product.category.name}</p>
                      <p className="text-sm text-brand-dark/70">
                        £{line.product.price_per_kg.toFixed(2)} per kg · {line.qty_kg.toFixed(2)} kg in basket
                      </p>
                      {line.options && (
                        <div className="mt-2 space-y-1 rounded-lg bg-brand-beige/30 p-3 text-xs">
                          <p className="font-semibold text-brand-dark">
                            {line.options.cut_clean_option.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </p>
                          {line.options.custom_note && (
                            <p className="text-brand-dark/70">
                              {line.options.custom_note}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="inline-flex items-center gap-3 rounded-full border border-brand-dark/10 bg-brand-beige/30 px-3 py-2 text-sm font-medium text-brand-dark">
                        <button
                          type="button"
                          onClick={() => update(line.product.slug, Number(Math.max(0, line.qty_kg - QTY_STEP).toFixed(2)), lineIndex)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg text-brand-dark shadow transition hover:bg-brand-dark hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Decrease ${line.product.name} quantity`}
                          disabled={line.qty_kg <= QTY_STEP}
                        >
                          −
                        </button>
                        <span className="min-w-[5.5rem] text-center text-sm font-semibold">
                          {line.qty_kg.toFixed(2)} kg
                        </span>
                        <button
                          type="button"
                          onClick={() => update(line.product.slug, Number((line.qty_kg + QTY_STEP).toFixed(2)), lineIndex)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg text-brand-dark shadow transition hover:bg-brand-dark hover:text-white"
                          aria-label={`Increase ${line.product.name} quantity`}
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-4 text-sm sm:flex-col sm:items-end sm:gap-1">
                        <p className="text-brand-dark/60">Line total</p>
                        <p className="text-lg font-semibold text-brand-dark">{currency.format(lineTotal)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-brand-dark/60">
                      <p>Freshly prepared every morning · Sustainably sourced</p>
                      <button
                        type="button"
                        onClick={() => remove(line.product.slug, lineIndex)}
                        className="rounded-full border border-red-200 px-3 py-1 font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}


          </section>

          <aside className="card flex h-fit flex-col gap-6 border border-brand-dark/10 p-6 text-brand-dark shadow-lg">
            <header className="space-y-1">
              <h2 className="text-xl font-semibold">Order summary</h2>
              <p className="text-sm text-brand-dark/60">
                {items.length} {items.length === 1 ? 'item' : 'items'} · {totalWeight.toFixed(2)} kg total weight
              </p>
            </header>

            <dl className="space-y-3 text-sm text-brand-dark/80">
              <div className="flex items-center justify-between">
                <dt>Subtotal</dt>
                <dd className="font-semibold">{currency.format(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Delivery</dt>
                <dd className="font-semibold">
                  {deliveryFee === 0
                    ? 'Included (orders over £50)'
                    : `${currency.format(deliveryFee)} (free over £50)`}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Estimated VAT (5%)</dt>
                <dd className="font-semibold">{currency.format(estimatedTax)}</dd>
              </div>
            </dl>

            <div className="h-px bg-brand-dark/10" />

            <div className="flex items-center justify-between text-lg font-semibold text-brand-dark">
              <span>Total due</span>
              <span>{currency.format(grandTotal)}</span>
            </div>

            <div className="rounded-2xl bg-brand-beige/40 p-4 text-xs text-brand-dark/70">
              <p className="font-semibold text-brand-dark">Add a delivery note</p>
              <p className="mt-1">
                Prefer contactless drop-off or need us to ring the bell? You can add notes during checkout and our crew will gladly accommodate.
              </p>
            </div>

            <Link
              href="/checkout"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-brand-olive text-base font-semibold text-white shadow transition hover:opacity-90"
            >
              Proceed to checkout
            </Link>

            <p className="text-xs text-brand-dark/50">
              Secure payments · Real-time order tracking · Refrigerated transport across Edinburgh
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
