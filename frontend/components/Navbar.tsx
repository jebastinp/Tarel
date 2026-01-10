'use client'

import Image from 'next/image'
import Link from 'next/link'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import Logo from '@/images/logo.png'
import { useAuth } from '@/providers/AuthProvider'
import { useCart } from '@/providers/CartProvider'

export default function Navbar() {
  const { count, total } = useCart()
  const { user, logout, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState('')

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [menuOpen])

  const userInitials = useMemo(() => {
    if (!user) return ''
    const parts = user.name.trim().split(' ')
    const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase())
    return initials.join('') || user.email.charAt(0).toUpperCase()
  }, [user])

  const cartLabel = useMemo(() => {
    if (!count) return 'Cart'
    const formattedTotal = total > 0 ? `£${total.toFixed(2)}` : undefined
    return formattedTotal ? `${formattedTotal}` : 'Cart'
  }, [count, total])

  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    const currentSearch = searchParams?.get('q') ?? ''
    setSearchValue(currentSearch)
  }, [searchParams])

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = searchValue.trim()

    const params = new URLSearchParams()
    const currentSlug = searchParams?.get('slug')
    if (currentSlug && currentSlug !== 'all') {
      params.set('slug', currentSlug)
    }
    if (query) {
      params.set('q', query)
    }

    const target = `/categories${params.toString() ? `?${params.toString()}` : ''}`
    router.push(target)

    // Close the mobile menu if it was open when searching
    setMenuOpen(false)

    // If we were on a different page, ensure input stays in sync with the freshly navigated URL
    if (pathname !== '/categories') {
      setSearchValue(query)
    }
  }

  return (
  <nav className="sticky top-0 z-50 border-b border-black/5 bg-gradient-to-b from-brand-beige via-white to-white shadow-[0_6px_18px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="max-w-6xl mx-auto px-4 py-5 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image
                src={Logo}
                alt="Tarel logo"
                width={220}
                height={72}
                priority
                className="h-16 w-auto object-contain"
              />
            </Link>
            <div className="hidden md:inline-flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-inner text-sm text-brand-dark/80">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21c4.97 0 9-3.805 9-8.5S14.97 2 12 2 3 5.805 3 10.5C3 15.195 7.03 21 12 21Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                />
              </svg>
              <span className="text-xs uppercase tracking-widest text-brand-dark/60">DELIVERING TO</span>
              <span className="text-sm font-semibold text-brand-dark">Scotland</span>
            </div>
          </div>

          <div className="hidden md:flex flex-1 items-center gap-3 md:max-w-md">
            <form
              className="relative flex-1 md:flex-[2]"
              role="search"
              onSubmit={handleSearchSubmit}
            >
              <input
                type="search"
                placeholder="Search for seabass, prawns, ready-to-cook..."
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                className="w-full rounded-full border border-brand-dark/10 bg-white px-8 py-3 text-sm shadow-sm outline-none focus:border-brand-dark/40 focus:ring-2 focus:ring-brand-olive/30"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand-dark text-white transition hover:bg-brand-dark/80"
                aria-label="Search products"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-4.35-4.35M4.75 11a6.25 6.25 0 1 1 12.5 0 6.25 6.25 0 0 1-12.5 0Z"
                  />
                </svg>
              </button>
            </form>

            {loading && (
              <div className="hidden h-11 w-11 animate-pulse rounded-full bg-brand-dark/10 md:inline-flex" aria-hidden />
            )}

            {!user && !loading && (
              <Link
                href="/login"
                className="hidden md:inline-flex items-center justify-center rounded-full border border-brand-dark/20 px-4 py-2 text-sm font-medium text-brand-dark transition hover:border-brand-dark hover:bg-brand-dark hover:text-white"
              >
                Login / Sign Up
              </Link>
            )}

            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-dark/20 bg-white text-sm font-semibold uppercase text-brand-dark shadow-sm transition hover:border-brand-dark/40"
                  aria-label="Account menu"
                >
                  {userInitials}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-20 mt-3 w-56 rounded-2xl border border-brand-dark/10 bg-white p-3 text-sm shadow-xl">
                    <div className="rounded-xl bg-brand-beige/30 p-3 text-xs text-brand-dark/70">
                      <p className="font-semibold text-brand-dark">{user.name}</p>
                      <p className="mt-1 truncate text-brand-dark/60">{user.email}</p>
                    </div>
                    <div className="mt-3 space-y-1 text-brand-dark/80">
                      <Link
                        href="/user/profile"
                        className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-brand-beige/40"
                        onClick={closeMenu}
                      >
                        <span>My profile</span>
                        <span className="text-xs text-brand-dark/50">↗</span>
                      </Link>
                      <Link
                        href="/user/orders"
                        className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-brand-beige/40"
                        onClick={closeMenu}
                      >
                        <span>Orders</span>
                        <span className="text-xs text-brand-dark/50">↗</span>
                      </Link>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu()
                        logout()
                      }}
                      className="mt-3 w-full rounded-xl border border-brand-dark/20 px-3 py-2 text-sm font-semibold text-brand-dark transition hover:border-brand-dark hover:bg-brand-dark hover:text-white"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            )}

            {!user && !loading && (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-brand-dark/20 px-4 py-2 text-sm font-medium text-brand-dark transition hover:border-brand-dark hover:bg-brand-dark hover:text-white md:hidden"
              >
                Login
              </Link>
            )}

            <Link
              href="/cart"
              className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3h2l2.4 12.3a1 1 0 0 0 .98.8h8.24a1 1 0 0 0 .97-.76l1.1-4.4M7 6h13l-1.34 5.36a1 1 0 0 1-.97.76H9.76"
                />
                <path d="M10 20a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
              </svg>
              <span>{cartLabel}</span>
              {count > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-[1.75rem] items-center justify-center rounded-full bg-white px-1 text-xs font-semibold text-brand-dark">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar - Full Width on New Line */}
        <div className="md:hidden">
          <form
            className="relative w-full"
            role="search"
            onSubmit={handleSearchSubmit}
          >
            <input
              type="search"
              placeholder="Search for seabass, prawns, ready-to-cook..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="w-full rounded-full border border-brand-dark/10 bg-white px-8 py-3 text-sm shadow-sm outline-none focus:border-brand-dark/40 focus:ring-2 focus:ring-brand-olive/30"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand-dark text-white transition hover:bg-brand-dark/80"
              aria-label="Search products"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-4.35-4.35M4.75 11a6.25 6.25 0 1 1 12.5 0 6.25 6.25 0 0 1-12.5 0Z"
                />
              </svg>
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-brand-dark/70">
          <Link href="/categories" className="font-medium text-brand-dark hover:text-brand-dark/70">
            Seafood
          </Link>
          <Link href="/categories?slug=fresh-fish" className="hover:text-brand-dark">
            Fresh Fish
          </Link>
          <Link href="/categories?slug=dry-fish" className="hover:text-brand-dark">
            Dry & Smoked
          </Link>
          <Link href="/categories?slug=combo" className="hover:text-brand-dark">
            Combo Offers
          </Link>
        </div>
      </div>
    </nav>
  )
}
