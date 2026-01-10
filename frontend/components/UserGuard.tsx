'use client'

import { useAuth } from '@/providers/AuthProvider'

export default function UserGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="rounded-3xl border border-brand-dark/10 bg-white/80 p-10 text-center text-brand-dark/70">
        Checking your account…
      </div>
    )
  }

  if (!user) {
    return (
      <div className="rounded-3xl border border-brand-dark/10 bg-white/90 p-10 text-center text-brand-dark/70">
        Please{' '}
        <a className="font-semibold text-brand-dark underline" href="/login">
          login
        </a>{' '}
        to view this page.
      </div>
    )
  }

  return <>{children}</>
}
