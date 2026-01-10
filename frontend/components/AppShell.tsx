'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, useMemo } from 'react'
import type { ReactNode } from 'react'

import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import UserGuard from '@/components/UserGuard'
import { CartProvider } from '@/providers/CartProvider'
import { useAuth } from '@/providers/AuthProvider'

type AppShellProps = {
  children: ReactNode
  guard?: boolean
  mode?: 'public' | 'user'
}

export default function AppShell({ children, guard = false, mode = 'public' }: AppShellProps) {
  const content = guard ? <UserGuard>{children}</UserGuard> : children

  return (
    <CartProvider>
      {mode === 'user' ? <AccountScaffold>{content}</AccountScaffold> : <PublicScaffold>{content}</PublicScaffold>}
    </CartProvider>
  )
}

type AccountNavItem = {
  href: string
  label: string
  description?: string
}

const ACCOUNT_NAV: AccountNavItem[] = [
  {
    href: '/user',
    label: 'Overview',
    description: 'Stay on top of deliveries and recent activity.',
  },
  {
    href: '/user/profile',
    label: 'Profile',
    description: 'Manage your personal info and password.',
  },
  {
    href: '/user/orders',
    label: 'Orders',
    description: 'Track purchases, totals, and delivery slots.',
  },
]

function PublicScaffold({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<div className="h-24 bg-brand-beige/50" />}>
        <Navbar />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>
      <Footer />
    </div>
  )
}

function AccountScaffold({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const currentPath = pathname ?? ''
  const { user, logout } = useAuth()

  const initials = useMemo(() => {
    if (!user) return ''
    const parts = user.name.trim().split(' ')
    const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase())
    return letters.join('') || user.email.charAt(0).toUpperCase()
  }, [user])

  return (
    <div className="min-h-screen bg-brand-beige/60">
      <header className="border-b border-brand-dark/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-dark/60">Customer Hub</p>
            <h1 className="text-3xl font-semibold text-brand-dark">Your Tarel account</h1>
            <p className="mt-2 max-w-xl text-sm text-brand-dark/70">
              Keep tabs on your orders, manage delivery preferences, and reach out when you need a hand.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden items-center gap-3 rounded-full border border-brand-dark/15 bg-white px-4 py-2 text-sm text-brand-dark/80 md:inline-flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-dark text-sm font-semibold uppercase text-white">
                  {initials}
                </span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-brand-dark">{user.name}</p>
                  <p className="text-xs text-brand-dark/60">{user.email}</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full border border-brand-dark/15 bg-white px-5 py-2 text-sm font-medium text-brand-dark transition hover:border-brand-dark hover:bg-brand-dark hover:text-white"
            >
              Sign out
            </button>
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 rounded-full border border-brand-dark/15 bg-white px-5 py-2 text-sm font-medium text-brand-dark transition hover:border-brand-dark hover:bg-brand-dark hover:text-white"
            >
              <span>← Browse the menu</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 lg:flex-row">
        <aside className="lg:w-72">
          <nav className="space-y-2">
            {ACCOUNT_NAV.map((item) => {
              const isActive = item.href === '/user' ? currentPath === '/user' : currentPath.startsWith(item.href)
              const base = 'block rounded-2xl border px-5 py-4 transition'
              const active = 'border-brand-dark bg-brand-dark text-white shadow-lg shadow-brand-dark/20'
              const idle = 'border-transparent bg-white/80 text-brand-dark/80 hover:border-brand-dark/30 hover:bg-white'

              return (
                <Link key={item.href} href={item.href} className={`${base} ${isActive ? active : idle}`}>
                  <span className="text-sm font-semibold">{item.label}</span>
                  {item.description && (
                    <span className={`mt-1 block text-xs ${isActive ? 'text-white/80' : 'text-brand-dark/60'}`}>
                      {item.description}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>


        </aside>

        <section className="flex-1">
          <div className="space-y-6">{children}</div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
