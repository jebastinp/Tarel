'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { buildApiUrl } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { useCart } from '@/providers/CartProvider'
import { useAuth } from '@/providers/AuthProvider'

const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
const SHIPPING_THRESHOLD = 20
const SHIPPING_FEE = 1

const deliverySlots = [
  { value: 'Morning', label: 'Morning (8:00 – 11:00)' },
  { value: 'Afternoon', label: 'Afternoon (12:00 – 15:00)' },
  { value: 'Evening', label: 'Evening (17:00 – 20:00)' },
]

type AddressOption = {
  id: string
  label: string
  line1: string
  locality: string
  city: string
  postcode: string
}

const PRIMARY_ADDRESS_ID = 'primary-address'

const createBlankAddress = (overrides: Partial<AddressOption> = {}): AddressOption => ({
  id: overrides.id ?? `address-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label: overrides.label ?? 'Additional address',
  line1: overrides.line1 ?? '',
  locality: overrides.locality ?? '',
  city: overrides.city ?? '',
  postcode: overrides.postcode ?? '',
})

export default function Checkout() {
  const { items, total, clear } = useCart()
  const { user } = useAuth()
  const [addressBook, setAddressBookState] = useState<AddressOption[]>([
    {
      id: PRIMARY_ADDRESS_ID,
      label: 'Primary address',
      line1: '',
      locality: '',
      city: 'Edinburgh',
      postcode: '',
    },
  ])
  const [selectedAddressId, setSelectedAddressId] = useState<string>(PRIMARY_ADDRESS_ID)
  const [slot, setSlot] = useState<string>(deliverySlots[0]?.value ?? 'Morning')
  const [notes, setNotes] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card')
  const [placing, setPlacing] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponMessage, setCouponMessage] = useState<string | null>(null)

  const persistAddressBook = useCallback((entries: AddressOption[]) => {
    if (typeof window === 'undefined') return
    if (!entries.length) {
      window.localStorage.removeItem('checkoutAddressBook')
    } else {
      window.localStorage.setItem('checkoutAddressBook', JSON.stringify(entries))
    }
  }, [])

  const updateAddressBook = useCallback(
    (updater: (prev: AddressOption[]) => AddressOption[]) => {
      setAddressBookState((prev) => {
        const next = updater(prev)
        persistAddressBook(next)
        return next
      })
    },
    [persistAddressBook],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem('checkoutAddressBook')
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as AddressOption[]
      if (!Array.isArray(parsed) || parsed.length === 0) return
      const hasPrimary = parsed.some((entry) => entry.id === PRIMARY_ADDRESS_ID)
      const next = hasPrimary
        ? parsed
        : [
            {
              id: PRIMARY_ADDRESS_ID,
              label: 'Primary address',
              line1: '',
              locality: '',
              city: 'Edinburgh',
              postcode: '',
            },
            ...parsed,
          ]
      setAddressBookState(next)
      setSelectedAddressId(next[0]?.id ?? PRIMARY_ADDRESS_ID)
    } catch (error) {
      console.warn('Failed to parse saved checkout addresses', error)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    setContactName((prev) => (prev ? prev : user.name ?? ''))
    setContactPhone((prev) => (prev ? prev : user.phone ?? ''))
    updateAddressBook((prev) => {
      const next = [...prev]
      const primaryIndex = next.findIndex((entry) => entry.id === PRIMARY_ADDRESS_ID)
      const userAddress: AddressOption = {
        id: PRIMARY_ADDRESS_ID,
        label: 'Primary address',
        line1: user.address_line1 ?? '',
        locality: user.locality ?? '',
        city: user.city ?? 'Edinburgh',
        postcode: user.postcode ?? '',
      }
      if (primaryIndex === -1) {
        next.unshift(userAddress)
      } else {
        const existing = next[primaryIndex]
        next[primaryIndex] = {
          ...existing,
          label: existing.label || 'Primary address',
          line1: userAddress.line1 || existing.line1,
          locality: userAddress.locality || existing.locality,
          city: userAddress.city || existing.city || 'Edinburgh',
          postcode: userAddress.postcode || existing.postcode,
        }
      }
      return next
    })
    setSelectedAddressId((current) => current || PRIMARY_ADDRESS_ID)
  }, [user, updateAddressBook])

  useEffect(() => {
    if (!addressBook.length) {
      const fallback: AddressOption = {
        id: PRIMARY_ADDRESS_ID,
        label: 'Primary address',
        line1: '',
        locality: '',
        city: 'Edinburgh',
        postcode: '',
      }
      setAddressBookState([fallback])
      setSelectedAddressId(PRIMARY_ADDRESS_ID)
      return
    }
    if (!selectedAddressId || !addressBook.some((entry) => entry.id === selectedAddressId)) {
      setSelectedAddressId(addressBook[0].id)
    }
  }, [addressBook, selectedAddressId])

  const selectedAddress = useMemo(
    () => addressBook.find((entry) => entry.id === selectedAddressId) ?? addressBook[0] ?? null,
    [addressBook, selectedAddressId],
  )

  const updateSelectedAddress = useCallback(
    (patch: Partial<Omit<AddressOption, 'id'>>) => {
      if (!selectedAddressId) return
      updateAddressBook((prev) =>
        prev.map((entry) => (entry.id === selectedAddressId ? { ...entry, ...patch } : entry)),
      )
    },
    [selectedAddressId, updateAddressBook],
  )

  const handleAddAddress = useCallback(() => {
    let newId = ''
    updateAddressBook((prev) => {
      const created = createBlankAddress({
        label: `Address ${prev.length + 1}`,
        city: 'Edinburgh',
      })
      newId = created.id
      return [...prev, created]
    })
    if (newId) {
      setSelectedAddressId(newId)
    }
  }, [updateAddressBook])

  const handleRemoveAddress = useCallback(
    (id: string) => {
      if (id === PRIMARY_ADDRESS_ID) return
      setAddressBookState((prev) => {
        const filtered = prev.filter((entry) => entry.id !== id)
        const next = filtered.length
          ? filtered
          : [
              {
                id: PRIMARY_ADDRESS_ID,
                label: 'Primary address',
                line1: '',
                locality: '',
                city: 'Edinburgh',
                postcode: '',
              },
            ]
        persistAddressBook(next)
        if (selectedAddressId === id) {
          setSelectedAddressId(next[0]?.id ?? '')
        }
        return next
      })
    },
    [persistAddressBook, selectedAddressId],
  )

  const subtotal = total
  const deliveryFee = useMemo(() => {
    if (!items.length) return 0
    return subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
  }, [items.length, subtotal])
  const grandTotal = useMemo(
    () => subtotal + deliveryFee,
    [subtotal, deliveryFee],
  )

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      setCouponMessage('Enter a promo code to apply discounts at payment.')
      return
    }
    setCouponMessage('Promotions are verified during payment — we will apply any qualifying savings.')
  }

  const place = async () => {
    if (!items.length) {
      setStatus({ type: 'error', message: 'Your cart is empty. Add products before placing an order.' })
      return
    }
    if (!selectedAddress || !selectedAddress.line1.trim()) {
      setStatus({ type: 'error', message: 'Please add a delivery address so our drivers know where to go.' })
      return
    }
    if (!selectedAddress.postcode.trim()) {
      setStatus({ type: 'error', message: 'Add a valid postcode so we know where to deliver.' })
      return
    }

    const trimmedAddress = selectedAddress.line1.trim()
    const trimmedPostcode = selectedAddress.postcode.trim().toUpperCase()

    updateSelectedAddress({ line1: trimmedAddress, postcode: trimmedPostcode })

    const token = getToken()
    if (!token) {
      setStatus({ type: 'error', message: 'Please log in to place your order and track deliveries.' })
      return
    }

    setStatus(null)
    setPlacing(true)

    try {
      const res = await fetch(buildApiUrl('/orders/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((line) => ({ product_id: line.product.id, qty_kg: line.qty_kg })),
          address_line: trimmedAddress,
          postcode: trimmedPostcode,
          delivery_slot: slot,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        setStatus({
          type: 'error',
          message: text || 'We were unable to confirm your order. Please try again in a moment.',
        })
        return
      }

      clear()
      setStatus({
        type: 'success',
        message: 'Order placed! You can now track it from your account dashboard.',
      })
      setNotes('')
      setCouponCode('')
      setCouponMessage(null)
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Something went wrong while processing your order.',
      })
    } finally {
      setPlacing(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await place()
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-10 space-y-2 text-brand-dark">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-dark/60">Checkout</p>
        <h1 className="text-3xl font-semibold">Secure your next-day seafood delivery</h1>
        <p className="text-sm text-brand-dark/70">
          Confirm where we&apos;re dropping off your chilled seafood, review delivery windows, and finish up with a secure payment.
        </p>
      </header>

      {!items.length && (
        <div className="card space-y-4 text-center text-brand-dark">
          <p className="text-lg font-medium">Your cart is currently empty.</p>
          <p className="text-sm text-brand-dark/70">Browse our catalogue to add sustainable seafood to your basket before checking out.</p>
          <div className="flex justify-center gap-3">
            <Link href="/products" className="btn inline-flex items-center gap-2">
              Browse products
            </Link>
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-dark/10 px-4 py-2 text-sm font-semibold text-brand-dark transition hover:border-brand-dark/40 hover:bg-brand-dark hover:text-white"
            >
              Return to cart
            </Link>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="rounded-3xl border border-brand-dark/10 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-brand-dark">Contact details</h2>
              <p className="mt-1 text-sm text-brand-dark/60">
                Let us know who to contact if we have any questions about your order.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-brand-dark">
                  <span className="font-semibold text-brand-dark/80">Full name</span>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    placeholder="e.g. Isla MacLeod"
                    className="w-full rounded-2xl border border-brand-dark/10 bg-brand-beige/20 px-4 py-3 text-sm font-medium text-brand-dark outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20"
                  />
                </label>
                <label className="space-y-2 text-sm text-brand-dark">
                  <span className="font-semibold text-brand-dark/80">Mobile number</span>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    placeholder="For delivery updates"
                    required
                    className="w-full rounded-2xl border border-brand-dark/10 bg-brand-beige/20 px-4 py-3 text-sm font-medium text-brand-dark outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-brand-dark/10 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-brand-dark">Delivery address</h2>
              <p className="mt-1 text-sm text-brand-dark/60">
                We currently deliver chilled orders across Edinburgh and the surrounding EH postcodes.
              </p>
              <div className="mt-4 space-y-5">
                <div className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-dark/40">Saved delivery addresses</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {addressBook.map((option) => {
                      const summary = [option.line1, option.locality, option.city, option.postcode]
                        .filter(Boolean)
                        .join(', ')
                      const isSelected = option.id === selectedAddress?.id
                      return (
                        <label
                          key={option.id}
                          className={`flex cursor-pointer flex-col gap-1 rounded-2xl border px-4 py-3 text-sm transition ${
                            isSelected
                              ? 'border-brand-olive bg-brand-olive/10 text-brand-dark'
                              : 'border-brand-dark/10 bg-brand-beige/20 text-brand-dark/70 hover:border-brand-olive/60'
                          }`}
                        >
                          <input
                            type="radio"
                            name="delivery-address"
                            value={option.id}
                            checked={selectedAddressId === option.id}
                            onChange={() => setSelectedAddressId(option.id)}
                            className="sr-only"
                          />
                          <span className="text-sm font-semibold">{option.label}</span>
                          <span className="text-xs text-brand-dark/60">
                            {summary || 'No details saved yet'}
                          </span>
                          {option.id !== PRIMARY_ADDRESS_ID && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                handleRemoveAddress(option.id)
                              }}
                              className="mt-2 inline-flex w-max items-center gap-1 rounded-xl border border-brand-dark/20 px-3 py-1 text-xs font-semibold text-brand-dark/70 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                              Remove
                            </button>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>

                <label className="space-y-2 text-sm text-brand-dark">
                  <span className="font-semibold text-brand-dark/80">House number & street</span>
                  <input
                    type="text"
                    value={selectedAddress?.line1 ?? ''}
                    onChange={(event) => updateSelectedAddress({ line1: event.target.value })}
                    placeholder="Flat 2F1, 10 Shore Road"
                    className="w-full rounded-2xl border border-brand-dark/10 bg-brand-beige/20 px-4 py-3 text-sm font-medium text-brand-dark outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm text-brand-dark">
                  <span className="font-semibold text-brand-dark/80">Locality</span>
                  <input
                    type="text"
                    value={selectedAddress?.locality ?? ''}
                    onChange={(event) => updateSelectedAddress({ locality: event.target.value })}
                    placeholder="e.g. Leith"
                    className="w-full rounded-2xl border border-brand-dark/10 bg-brand-beige/20 px-4 py-3 text-sm font-medium text-brand-dark outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                  <label className="space-y-2 text-sm text-brand-dark">
                    <span className="font-semibold text-brand-dark/80">Town / City</span>
                    <input
                      type="text"
                      value={selectedAddress?.city ?? ''}
                      onChange={(event) => updateSelectedAddress({ city: event.target.value })}
                      placeholder="Edinburgh"
                      className="w-full rounded-2xl border border-brand-dark/10 bg-brand-beige/20 px-4 py-3 text-sm font-medium text-brand-dark outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-brand-dark">
                    <span className="font-semibold text-brand-dark/80">Postcode</span>
                    <input
                      type="text"
                      value={selectedAddress?.postcode ?? ''}
                      onChange={(event) => updateSelectedAddress({ postcode: event.target.value.toUpperCase() })}
                      placeholder="EH1 1AA"
                      className="w-full rounded-2xl border border-brand-dark/10 bg-brand-beige/20 px-4 py-3 text-sm font-medium text-brand-dark outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20"
                      required
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleAddAddress}
                    className="inline-flex items-center gap-2 rounded-2xl border border-brand-dark/20 px-4 py-2 text-sm font-semibold text-brand-dark transition hover:border-brand-olive/60 hover:bg-brand-olive/10"
                  >
                    + Add another address
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <p className="text-sm font-semibold text-brand-dark/80">Choose a delivery window</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {deliverySlots.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer flex-col rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                        slot === option.value
                          ? 'border-brand-olive bg-brand-olive/10 text-brand-dark'
                          : 'border-brand-dark/10 bg-brand-beige/20 text-brand-dark/70 hover:border-brand-olive/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery-slot"
                        value={option.value}
                        checked={slot === option.value}
                        onChange={(event) => setSlot(event.target.value)}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <label className="mt-6 block space-y-2 text-sm text-brand-dark">
                <span className="font-semibold text-brand-dark/80">Delivery notes</span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Let us know about secure entry codes, preferred drop-off locations, or special instructions."
                  className="w-full rounded-2xl border border-brand-dark/10 bg-brand-beige/20 px-4 py-3 text-sm font-medium text-brand-dark outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20"
                />
              </label>
            </section>

            <section className="rounded-3xl border border-brand-dark/10 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-brand-dark">Payment</h2>
              <p className="mt-1 text-sm text-brand-dark/60">
                We currently accept secure card payments or cash on delivery for recurring customers.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label
                  className={`flex cursor-pointer flex-col gap-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    paymentMethod === 'card'
                      ? 'border-brand-olive bg-brand-olive/10 text-brand-dark'
                      : 'border-brand-dark/10 bg-brand-beige/20 text-brand-dark/70 hover:border-brand-olive/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="sr-only"
                  />
                  Card payment
                  <span className="text-xs font-normal text-brand-dark/60">
                    Pay securely online and receive immediate confirmation.
                  </span>
                </label>
                <label
                  className={`flex cursor-pointer flex-col gap-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    paymentMethod === 'cash'
                      ? 'border-brand-olive bg-brand-olive/10 text-brand-dark'
                      : 'border-brand-dark/10 bg-brand-beige/20 text-brand-dark/70 hover:border-brand-olive/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={() => setPaymentMethod('cash')}
                    className="sr-only"
                  />
                  Cash on delivery
                  <span className="text-xs font-normal text-brand-dark/60">
                    Settle up with our driver — perfect for standing orders.
                  </span>
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-brand-dark/10 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-brand-dark">Promo code</h2>
              <p className="mt-1 text-sm text-brand-dark/60">
                Have a partner or welcome code? Enter it below and we&apos;ll confirm it during payment.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  placeholder="e.g. LOCALSEA10"
                  className="w-full rounded-2xl border border-brand-dark/10 bg-brand-beige/20 px-4 py-3 text-sm font-medium text-brand-dark outline-none transition focus:border-brand-olive focus:ring-2 focus:ring-brand-olive/20"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="inline-flex items-center justify-center rounded-2xl bg-brand-dark px-6 py-3 text-sm font-semibold text-white shadow transition hover:opacity-90"
                >
                  Apply
                </button>
              </div>
              {couponMessage && <p className="mt-2 text-xs text-brand-dark/60">{couponMessage}</p>}
            </section>

            {status && (
              <p
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  status.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {status.message}
              </p>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/cart"
                className="inline-flex items-center justify-center rounded-2xl border border-brand-dark/20 px-5 py-3 text-sm font-semibold text-brand-dark transition hover:border-brand-dark hover:bg-brand-dark hover:text-white"
              >
                ← Back to cart
              </Link>
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-brand-olive px-6 text-base font-semibold text-white shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={placing}
              >
                {placing ? 'Processing order…' : `Place order (${currency.format(grandTotal)})`}
              </button>
            </div>
          </form>

          <aside className="card flex h-fit flex-col gap-5 border border-brand-dark/10 p-6 text-brand-dark shadow-lg">
            <header className="space-y-1">
              <h2 className="text-xl font-semibold">Order summary</h2>
              <p className="text-sm text-brand-dark/60">{items.length} {items.length === 1 ? 'item' : 'items'} in basket</p>
            </header>
            <div className="space-y-4 text-sm">
              {items.map((line) => (
                <div key={line.product.id} className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-brand-dark">{line.product.name}</p>
                    <p className="text-xs text-brand-dark/60">
                      {line.qty_kg.toFixed(2)} kg × £{line.product.price_per_kg.toFixed(2)} per kg
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-brand-dark">
                    {currency.format(line.qty_kg * line.product.price_per_kg)}
                  </p>
                </div>
              ))}
            </div>

            <div className="h-px bg-brand-dark/10" />

            <dl className="space-y-3 text-sm text-brand-dark/80">
              <div className="flex items-center justify-between">
                <dt>Subtotal</dt>
                <dd className="font-semibold">{currency.format(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Delivery</dt>
                <dd className="font-semibold">
                  {deliveryFee === 0
                    ? 'Free (orders over £20)'
                    : `${currency.format(deliveryFee)} (free over £20)`}
                </dd>
              </div>
            </dl>

            <div className="h-px bg-brand-dark/10" />

            <div className="flex items-center justify-between text-lg font-semibold text-brand-dark">
              <span>Total due today</span>
              <span>{currency.format(grandTotal)}</span>
            </div>

            <div className="rounded-2xl bg-brand-beige/40 p-4 text-xs text-brand-dark/70">
              <p className="font-semibold text-brand-dark">Freshness guarantee</p>
              <p className="mt-1">
                All seafood is temperature controlled from shore to your doorstep. If something isn&apos;t perfect, we&apos;ll make it right.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
