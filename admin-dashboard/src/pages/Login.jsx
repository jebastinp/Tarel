import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import logoUrl from '../assets/logo.png?url'

const DEFAULT_ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').trim()
const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || ''

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: DEFAULT_ADMIN_EMAIL, password: DEFAULT_ADMIN_PASSWORD })
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const { token, user, loading, error: authError, signIn } = useAuth()

  const redirectTo = useMemo(
    () => location.state?.from?.pathname ?? '/admin/dashboard',
    [location.state]
  )

  useEffect(() => {
    if (!loading && token && user) {
      navigate(redirectTo, { replace: true })
    }
  }, [loading, token, user, navigate, redirectTo])

  useEffect(() => {
    if (authError) {
      setFeedback(authError)
    }
  }, [authError])

  useEffect(() => {
    if (location.state?.message) {
      setFeedback(location.state.message)
    }
  }, [location.state])

  const onSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setFeedback('')

    try {
      await signIn({ email: form.email, password: form.password })
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to sign in')
    }

    setSubmitting(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-secondary/40 px-4 py-16">
      <div className="pointer-events-none absolute left-10 top-10 h-64 w-64 rounded-full bg-secondary/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-20 right-12 h-72 w-72 rounded-full bg-background/30 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-[36px] border border-white/10 bg-white/5 shadow-2xl backdrop-blur md:flex-row">
        <div className="flex flex-1 flex-col gap-6 bg-gradient-to-br from-primary via-primary/95 to-secondary/50 p-10 text-background">
          <div className="inline-flex items-center justify-center self-start rounded-3xl bg-white px-8 py-5 shadow-xl">
            <img src={logoUrl} alt="Tarel" className="h-16 w-auto" />
          </div>
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-background/70">Admin Console</p>
            <h1 className="text-4xl font-bold text-background">Steer the fleet</h1>
            <p className="max-w-md text-sm text-background/80">
              Manage catalogue freshness, monitor daily sales, and keep customer support flowing — all from one
              streamlined hub tuned for Edinburgh&apos;s seafood drop.
            </p>
          </div>
          <div className="mt-auto space-y-2 text-xs text-background/70">
            <p>Need access? Contact ops@tarel.co.uk</p>
            <p>Secure admin sign-in with JWT-backed sessions.</p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center bg-white/10 p-10">
          <form
            onSubmit={onSubmit}
            className="w-full max-w-md space-y-6 rounded-3xl border border-white/20 bg-white/10 p-8 text-primary shadow-2xl backdrop-blur"
          >
            <div className="text-center">
              <h2 className="text-3xl font-semibold text-primary">Tarel Admin</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-primary/80">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  placeholder="admin@tarel.local"
                  className="w-full rounded-2xl border border-secondary/30 bg-white/70 px-4 py-3 text-sm text-primary shadow-sm outline-none transition focus:border-secondary focus:bg-white focus:ring-2 focus:ring-secondary/30"
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-primary/80">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={form.password}
                  placeholder="Enter password"
                  className="w-full rounded-2xl border border-secondary/30 bg-white/70 px-4 py-3 text-sm text-primary shadow-sm outline-none transition focus:border-secondary focus:bg-white focus:ring-2 focus:ring-secondary/30"
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>
            {feedback ? (
              <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{feedback}</p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-secondary py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="text-center text-[11px] text-primary/50">
              Protected environment — ensure you log out on shared devices.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
