import type { Product, CartItemOptions } from './types'

export type CartLine = { 
  product: Product
  qty_kg: number
  options?: CartItemOptions
}

const STORAGE_KEY = 'tarel-cart'

function safeWindow() {
  return typeof window === 'undefined' ? null : window
}

export function loadCart(): CartLine[] {
  const win = safeWindow()
  if (!win) return []
  try {
    const raw = win.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartLine[]) : []
  } catch {
    return []
  }
}

export function persistCart(lines: CartLine[]) {
  const win = safeWindow()
  if (!win) return
  try {
    win.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
  } catch {
    /* swallow */
  }
}
