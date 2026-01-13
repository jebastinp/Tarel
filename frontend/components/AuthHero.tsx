'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import Logo from '@/images/logo.png'
import { buildApiUrl } from '@/lib/api'

type AuthFormValues = {
  name?: string
  phone?: string
  email: string
  password: string
  address?: {
    line1: string
    locality: string
    city: string
    postcode: string
  }
}

interface Props {
  mode?: 'login' | 'signup'
  onSubmit?: (form: AuthFormValues) => Promise<void> | void
}

export default function AuthHero({ mode = 'login', onSubmit }: Props) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(mode)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [line1, setLine1] = useState('')
  const [locality, setLocality] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')
  const [message, setMessage] = useState('')
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{ id: string; address: string }>>([])
  const [addressLoading, setAddressLoading] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)
  const fetchController = useRef<AbortController | null>(null)

  const isSignup = activeTab === 'signup'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    try {
      await onSubmit?.({
        name: isSignup ? name : undefined,
        phone: isSignup ? phone : undefined,
        email,
        password,
        address: isSignup
          ? {
              line1,
              locality,
              city,
              postcode,
            }
          : undefined,
      })
    } catch (error: any) {
      setMessage(error?.message || 'Something went wrong')
    }
  }

  useEffect(() => {
    if (!isSignup) {
      setAddressSuggestions([])
      setAddressLoading(false)
      setAddressError(null)
      return
    }

    const term = line1.trim()
    if (term.length < 3) {
      if (fetchController.current) {
        fetchController.current.abort()
        fetchController.current = null
      }
      setAddressSuggestions([])
      setAddressLoading(false)
      setAddressError(null)
      return
    }

    const controller = new AbortController()
    fetchController.current = controller
    setAddressLoading(true)
    setAddressError(null)

    const timeoutId = window.setTimeout(async () => {
      try {
        const url = new URL(buildApiUrl('/site/address/autocomplete'))
        url.searchParams.set('term', term)
        url.searchParams.set('top', '6')

        const response = await fetch(url.toString(), {
          signal: controller.signal,
        })
        if (!response.ok) {
          const detail = await response.json().catch(() => ({}))
          const message = typeof detail?.detail === 'string' ? detail.detail : detail?.detail?.message
          throw new Error(message || 'Unable to fetch address suggestions.')
        }
        const data = await response.json()
        setAddressSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : [])
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setAddressError((error as Error).message)
          setAddressSuggestions([])
        }
      } finally {
        setAddressLoading(false)
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [isSignup, line1])

  const handleSuggestionSelect = async (suggestion: { id: string; address: string }) => {
    setAddressSuggestions([])
    setAddressLoading(true)
    setAddressError(null)

    try {
      const url = new URL(buildApiUrl('/site/address/getaddress'))
      url.searchParams.set('id', suggestion.id)

      const response = await fetch(url.toString())
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        const message = typeof detail?.detail === 'string' ? detail.detail : detail?.detail?.message
        throw new Error(message || 'Unable to fetch address details.')
      }
      const data = await response.json()
      setLine1(data?.line_1 || suggestion.address)
      setLocality(data?.locality || '')
      setCity(data?.town_or_city || '')
      setPostcode((data?.postcode || '').toUpperCase())
    } catch (error) {
      setAddressError((error as Error).message)
      setLine1(suggestion.address)
    } finally {
      setAddressLoading(false)
    }
  }

  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-none sm:rounded-[36px] bg-gradient-to-br from-brand-dark via-brand-dark/90 to-brand-olive/40 shadow-2xl text-white md:flex-row min-h-[100dvh] sm:min-h-0">
      <div className="relative flex flex-1 flex-col items-center gap-4 sm:gap-6 p-6 sm:p-10 md:max-w-sm text-center md:items-start md:text-left">
        <div className="inline-flex items-center justify-center rounded-2xl sm:rounded-3xl bg-white px-6 sm:px-8 py-4 sm:py-5 shadow-xl">
          <Image src={Logo} alt="Tarel" width={260} height={86} className="h-16 sm:h-20 w-auto object-contain" priority />
        </div>
        <div className="space-y-2 sm:space-y-3 md:max-w-xs">
          <div className="flex items-center justify-center gap-2 sm:gap-3 md:justify-start">
            <Image src={Logo} alt="Tarel" width={100} height={32} className="h-5 sm:h-6 w-auto object-contain" />
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] text-brand-beige/70">Welcome to Tarel</p>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold">{isSignup ? 'Create account' : 'Sign back in'}</h1>
          <p className="text-xs sm:text-sm text-white/80">
            Premium access to Edinburgh&apos;s freshest catch. Track orders, save favourites, and manage
            delivery slots effortlessly.
          </p>
        </div>
        <div className="hidden md:block mt-auto space-y-2 text-sm text-white/70">
          <p>Need help? Email hello@tarel.co.uk</p>
          <p>Secure checkout powered by Stripe (test mode)</p>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center bg-white p-6 sm:p-10">
        <div className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-brand-dark/10 bg-white p-6 sm:p-8 shadow-2xl">
          <div className="flex gap-2 sm:gap-3 rounded-full bg-brand-beige/50 p-1 text-xs sm:text-sm font-semibold text-brand-dark">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 rounded-full px-3 sm:px-4 py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark ${
                !isSignup ? 'bg-brand-dark text-white shadow-md' : 'text-brand-dark/60 hover:text-brand-dark'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`flex-1 rounded-full px-3 sm:px-4 py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark ${
                isSignup ? 'bg-brand-dark text-white shadow-md' : 'text-brand-dark/60 hover:text-brand-dark'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {isSignup && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-brand-dark">
                    <span className="text-xs uppercase tracking-widest text-brand-dark/70">Full name</span>
                    <input
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Eg. Jamie Fraser"
                      className="mt-2 w-full rounded-2xl border border-brand-dark/15 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
                    />
                  </label>
                  <label className="block text-brand-dark">
                    <span className="text-xs uppercase tracking-widest text-brand-dark/70">Mobile number</span>
                    <input
                      required
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Eg. +44 7123 456789"
                      className="mt-2 w-full rounded-2xl border border-brand-dark/15 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
                    />
                  </label>
                </div>
                <div className="space-y-4 rounded-2xl border border-brand-dark/10 bg-brand-beige/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-dark/50">UK delivery address</p>
                  <div className="space-y-3">
                    <div className="relative">
                      <label className="block text-brand-dark">
                        <span className="text-xs uppercase tracking-widest text-brand-dark/70">House number & street</span>
                        <input
                          required
                          value={line1}
                          onChange={(event) => setLine1(event.target.value)}
                          placeholder="Eg. 42 Leith Walk"
                          className="mt-2 w-full rounded-2xl border border-brand-dark/15 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
                          autoComplete="address-line1"
                        />
                      </label>
                      {(addressSuggestions.length > 0 || addressLoading || addressError) && (
                        <div className="absolute left-0 right-0 z-10 mt-2 overflow-hidden rounded-2xl border border-brand-dark/15 bg-white shadow-lg">
                          {addressLoading && (
                            <div className="px-4 py-3 text-sm text-brand-dark/60">Searching addresses…</div>
                          )}
                          {addressError && !addressLoading && (
                            <div className="px-4 py-3 text-sm text-red-600">{addressError}</div>
                          )}
                          {!addressLoading && !addressError && addressSuggestions.length > 0 && (
                            <ul className="max-h-64 divide-y divide-brand-dark/10 text-sm text-brand-dark/80">
                              {addressSuggestions.map((suggestion) => (
                                <li key={suggestion.id}>
                                  <button
                                    type="button"
                                    onClick={() => handleSuggestionSelect(suggestion)}
                                    className="w-full px-4 py-3 text-left transition hover:bg-brand-beige/40"
                                  >
                                    {suggestion.address}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          {!addressLoading && !addressError && addressSuggestions.length === 0 && (
                            <div className="px-4 py-3 text-sm text-brand-dark/60">No matches yet. Keep typing…</div>
                          )}
                        </div>
                      )}
                    </div>
                    <label className="block text-brand-dark">
                      <span className="text-xs uppercase tracking-widest text-brand-dark/70">Locality</span>
                      <input
                        required
                        value={locality}
                        onChange={(event) => setLocality(event.target.value)}
                        placeholder="Eg. Leith"
                        className="mt-2 w-full rounded-2xl border border-brand-dark/15 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-brand-dark">
                        <span className="text-xs uppercase tracking-widest text-brand-dark/70">Town / City</span>
                        <input
                          required
                          value={city}
                          onChange={(event) => setCity(event.target.value)}
                          placeholder="Eg. Edinburgh"
                          className="mt-2 w-full rounded-2xl border border-brand-dark/15 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
                        />
                      </label>
                      <label className="block text-brand-dark">
                        <span className="text-xs uppercase tracking-widest text-brand-dark/70">Postcode</span>
                        <input
                          required
                          value={postcode}
                          onChange={(event) => setPostcode(event.target.value.toUpperCase())}
                          placeholder="Eg. EH6 7DX"
                          className="mt-2 w-full rounded-2xl border border-brand-dark/15 bg-white px-4 py-3 text-sm text-brand-dark uppercase tracking-wide outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <label className="block text-brand-dark">
              <span className="text-xs uppercase tracking-widest text-brand-dark/70">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-2xl border border-brand-dark/15 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
              />
            </label>
            <label className="block text-brand-dark">
              <span className="text-xs uppercase tracking-widest text-brand-dark/70">Password</span>
              <input
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                className="mt-2 w-full rounded-2xl border border-brand-dark/15 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-dark focus:ring-2 focus:ring-brand-dark/20"
              />
            </label>
            <button
              type="submit"
              className="mt-4 w-full rounded-2xl bg-brand-dark px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
            >
              Login / Sign Up
            </button>
            <p className="text-center text-xs text-brand-dark/60">
              By continuing, you agree to our{' '}
              <Link href="/legal/terms-and-conditions" className="font-medium underline underline-offset-2 hover:text-brand-dark">
                Terms
              </Link>{' '}
              and acknowledge the{' '}
              <Link href="/legal/privacy-policy" className="font-medium underline underline-offset-2 hover:text-brand-dark">
                Privacy Policy
              </Link>
              .
            </p>
            {message && <p className="text-center text-xs text-red-600">{message}</p>}
          </form>
        </div>
      </div>

      <div className="pointer-events-none absolute -left-32 top-16 h-64 w-64 rounded-full bg-brand-olive/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-brand-beige/30 blur-3xl" />
    </div>
  )
}
