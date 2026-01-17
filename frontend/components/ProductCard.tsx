'use client'

import { useMemo, useState } from 'react'

import { useCart } from '@/providers/CartProvider'
import type { Product } from '@/lib/types'
import { buildMediaUrl } from '@/lib/api'
import AddToCartModal from './AddToCartModal'
import type { CartItemWithOptions } from './AddToCartModal'

const badgeCopy = {
  fresh: 'Fresh Catch',
  dry: 'Sun-dried',
}

export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const badge = product.is_dry ? badgeCopy.dry : badgeCopy.fresh

  const handleAddToCart = (product: Product, options: CartItemWithOptions) => {
    const { qty_kg, cut_clean_option, instructions, custom_note } = options
    add(product, qty_kg, {
      cut_clean_option,
      instructions,
      custom_note,
    })
  }

  return (
    <>
      <div className="group flex h-full flex-col overflow-hidden rounded-3xl border border-brand-dark/10 bg-white shadow-md transition hover:-translate-y-1 hover:shadow-2xl">
        <div className="relative">
        <img
          src={buildMediaUrl(product.image_url)}
          alt={product.name}
          className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-dark">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-olive" />
          {badge}
        </div>
        <div className="absolute right-4 top-4 rounded-full bg-brand-dark/90 px-3 py-1 text-xs font-semibold text-white">
          £{product.price_per_kg.toFixed(2)} / kg
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-widest text-brand-dark/50">{product.category.name}</p>
          <h3 className="text-xl font-semibold text-brand-dark">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-brand-dark/70 max-h-14 overflow-hidden">{product.description}</p>
          )}
        </div>
        <div className="mt-auto flex items-center justify-end">
          <button
            className="rounded-full bg-brand-dark px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-olive"
            onClick={() => setIsModalOpen(true)}
          >
            Add to cart
          </button>
        </div>
      </div>
      </div>

      <AddToCartModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToCart={handleAddToCart}
      />
    </>
  )
}
