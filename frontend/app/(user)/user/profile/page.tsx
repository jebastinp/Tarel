'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { authHeader } from '@/lib/auth'
import { buildApiUrl } from '@/lib/api'
import { useAuth } from '@/providers/AuthProvider'

type UpdateFormState = {
  name: string
  password: string
}

type FeedbackState = {
  status: 'idle' | 'saving' | 'success' | 'error'
  message?: string
}

export default function ProfilePage() {
  const { user, loading, refresh } = useAuth()
  const [form, setForm] = useState<UpdateFormState>({ name: '', password: '' })
  const [feedback, setFeedback] = useState<FeedbackState>({ status: 'idle' })

  useEffect(() => {
    if (user) {
      setForm((prev) => ({ ...prev, name: user.name }))
    }
  }, [user])

  const joinedOn = useMemo(() => {
    if (!user?.created_at) return null
    return new Date(user.created_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }, [user])

  const handleChange = (field: keyof UpdateFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return

    const payload: Record<string, string> = {}
    if (form.name.trim() && form.name.trim() !== user.name) {
      payload.name = form.name.trim()
    }
    if (form.password.trim()) {
      payload.password = form.password.trim()
    }

    if (Object.keys(payload).length === 0) {
      setFeedback({ status: 'error', message: 'Update your name or password before saving.' })
      return
    }

    setFeedback({ status: 'saving' })
    try {
  const res = await fetch(buildApiUrl('/auth/me'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      await refresh()
      setFeedback({ status: 'success', message: 'Profile updated successfully.' })
      setForm((prev) => ({ ...prev, password: '' }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile.'
      setFeedback({ status: 'error', message })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 animate-pulse rounded-3xl bg-white/70" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-3xl bg-white/60" />
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="rounded-3xl border border-dashed border-brand-dark/20 bg-white p-10 text-center text-brand-dark/70">
        <p className="text-lg font-semibold">You need to be logged in to view your profile.</p>
        <Link href="/login" className="mt-4 inline-flex items-center justify-center rounded-full bg-brand-dark px-6 py-3 text-sm font-semibold text-white">
          Go to login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-brand-dark to-brand-olive/80 p-8 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">Profile overview</p>
        <h1 className="mt-2 text-3xl font-semibold">Hello, {user.name.split(' ')[0] || 'there'} 👋</h1>
        <p className="mt-4 max-w-2xl text-sm text-white/80">
          Manage your personal information, preferred contact details, and passwords just like on your favourite e-commerce hubs.
        </p>
        {joinedOn && <p className="mt-6 text-xs text-white/70">Member since {joinedOn}</p>}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-3xl border border-brand-dark/10 bg-white p-6 shadow-sm lg:col-span-2">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-dark">Account details</h2>
              <p className="text-sm text-brand-dark/70">Update your display name or refresh your password.</p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <label className="block text-sm text-brand-dark/80">
              <span className="text-xs uppercase tracking-widest text-brand-dark/60">Full name</span>
              <input
                value={form.name}
                onChange={handleChange('name')}
                placeholder="Your full name"
                className="mt-2 w-full rounded-2xl border border-brand-dark/15 bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-dark/40 focus:ring-2 focus:ring-brand-olive/30"
              />
            </label>

            <label className="block text-sm text-brand-dark/80">
              <span className="text-xs uppercase tracking-widest text-brand-dark/60">Password</span>
              <input
                type="password"
                value={form.password}
                onChange={handleChange('password')}
                placeholder="Set a new password"
                className="mt-2 w-full rounded-2xl border border-brand-dark/15 bg-white px-4 py-3 text-sm text-brand-dark outline-none focus:border-brand-dark/40 focus:ring-2 focus:ring-brand-olive/30"
              />
              <span className="mt-2 block text-xs text-brand-dark/50">Leave blank to keep your current password.</span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={feedback.status === 'saving'}
                className="inline-flex items-center justify-center rounded-full bg-brand-dark px-6 py-3 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {feedback.status === 'saving' ? 'Saving…' : 'Save changes'}
              </button>
              {feedback.status === 'success' && (
                <span className="text-sm font-medium text-green-700">{feedback.message}</span>
              )}
              {feedback.status === 'error' && (
                <span className="text-sm font-medium text-red-600">{feedback.message}</span>
              )}
            </div>
          </form>
        </article>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-brand-dark/10 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-brand-dark">Contact</h3>
            <p className="mt-2 text-sm text-brand-dark/70">{user.email}</p>
            <p className="mt-4 text-xs text-brand-dark/50">
              Need assistance? Drop us an email and we&apos;ll jump in.
            </p>
          </div>

          <div className="rounded-3xl border border-brand-dark/10 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-brand-dark">Quick links</h3>
            <ul className="mt-3 space-y-2 text-sm text-brand-dark/70">
              <li>
                <Link href="/user/orders" className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-brand-beige/40">
                  <span>View orders</span>
                  <span className="text-xs text-brand-dark/50">↗</span>
                </Link>
              </li>
              <li>
                <Link href="/categories" className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-brand-beige/40">
                  <span>Shop fresh catch</span>
                  <span className="text-xs text-brand-dark/50">↗</span>
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </section>
    </div>
  )
}
