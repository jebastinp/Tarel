'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import type { Product, CartItemOptions } from '@/lib/types'
import { loadCart, persistCart, type CartLine as StoredLine } from '@/lib/cart'

type CartLine = { 
  product: Product
  qty_kg: number
  options?: CartItemOptions
}

type CartContextValue = {
  items: CartLine[]
  add: (product: Product, qty: number, options?: CartItemOptions) => void
  update: (slug: string, qty: number, lineIndex?: number) => void
  remove: (slug: string, lineIndex?: number) => void
  clear: () => void
  count: number
  total: number
}

const CartCtx = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([])

  useEffect(() => {
    const stored = loadCart()
    if (stored.length) {
      setItems(stored as CartLine[])
    }
  }, [])

  useEffect(() => {
    persistCart(items as StoredLine[])
  }, [items])

  const add = useCallback((product: Product, qty: number, options?: CartItemOptions) => {
    if (qty <= 0) return
    setItems((prev) => {
      const next = [...prev]
      // If options are provided, always add as a new line item (different customizations)
      if (options) {
        next.push({ product, qty_kg: qty, options })
      } else {
        // Without options, merge with existing item
        const idx = next.findIndex((line) => line.product.id === product.id && !line.options)
        if (idx > -1) {
          next[idx] = { product, qty_kg: next[idx].qty_kg + qty }
        } else {
          next.push({ product, qty_kg: qty })
        }
      }
      return next
    })
  }, [])

  const update = useCallback((slug: string, qty: number, lineIndex?: number) => {
    setItems((prev) => {
      if (qty <= 0) {
        if (lineIndex !== undefined) {
          return prev.filter((_, idx) => idx !== lineIndex)
        }
        return prev.filter((line) => line.product.slug !== slug)
      }
      if (lineIndex !== undefined) {
        return prev.map((line, idx) =>
          idx === lineIndex ? { ...line, qty_kg: qty } : line,
        )
      }
      return prev.map((line) =>
        line.product.slug === slug ? { ...line, qty_kg: qty } : line,
      )
    })
  }, [])

  const remove = useCallback((slug: string, lineIndex?: number) => {
    setItems((prev) => {
      if (lineIndex !== undefined) {
        return prev.filter((_, idx) => idx !== lineIndex)
      }
      return prev.filter((line) => line.product.slug !== slug)
    })
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const count = items.length
  const total = useMemo(
    () => items.reduce((sum, line) => sum + line.qty_kg * line.product.price_per_kg, 0),
    [items],
  )

  const value = useMemo(
    () => ({ items, add, update, remove, clear, count, total }),
    [items, add, update, remove, clear, count, total],
  )

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

export function useCart() {
  const ctx = useContext(CartCtx)
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}
