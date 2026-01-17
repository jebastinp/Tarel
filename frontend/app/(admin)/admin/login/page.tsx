'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useState } from 'react'

import { buildApiUrl } from '@/lib/api'
import { parseErrorMessage } from '@/lib/errors'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'
import Logo from '@/images/logo.png'

export default function AdminLoginPage() {
  const router = useRouter()
  const { setSession, user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // If user is already logged in and is an admin, redirect to dashboard
  if (user?.role === 'admin') {
    router.push('/admin/dashboard')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(buildApiUrl('/auth/login'), {
        method: 'POST',
        body: new URLSearchParams({ username: email, password }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        const errorMessage = parseErrorMessage(errorText)
        throw new Error(errorMessage)
      }

      const data = await res.json()

      // Check if user is admin
      if (data.user.role !== 'admin') {
        showError('Access denied. Admin credentials required.')
        return
      }

      setSession(data.access_token, data.user)
      showSuccess('Login successful! Welcome to admin dashboard.')
      router.push('/admin/dashboard')
    } catch (error: any) {
      showError(error?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-dark via-brand-dark/90 to-brand-olive/40 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 inline-flex items-center justify-center rounded-3xl bg-white px-8 py-5 shadow-xl">
            <Image src={Logo} alt="Tarel" width={260} height={86} className="h-20 w-auto object-contain" priority />
          </div>
          <h1 className="text-3xl font-bold text-white">Admin Login</h1>
          <p className="mt-2 text-sm text-white/80">Access the admin dashboard</p>
        </div>

        <div className="rounded-3xl border border-brand-dark/10 bg-white p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-dark">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-brand-dark/15 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
                placeholder="admin@tarel.co.uk"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-brand-dark">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-brand-dark/15 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-brand-dark px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-white/70">
          Not an admin?{' '}
          <button
            onClick={() => router.push('/login')}
            className="font-medium text-white underline underline-offset-2 hover:text-brand-beige"
          >
            User login
          </button>
        </p>
      </div>
    </div>
  )
}
