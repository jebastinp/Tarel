'use client'

import { useRouter } from 'next/navigation'

import AuthHero from '@/components/AuthHero'
import { buildApiUrl } from '@/lib/api'
import { parseErrorMessage } from '@/lib/errors'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'

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

export default function AuthPage() {
  const router = useRouter()
  const { setSession } = useAuth()
  const { showSuccess } = useToast()

  const handleAuth = async ({ name, phone, email, password, address }: AuthFormValues) => {
    const isSignup = Boolean(name)
    const endpoint = isSignup ? '/auth/register' : '/auth/login'

    const res = await fetch(buildApiUrl(endpoint), {
      method: 'POST',
      headers: isSignup ? { 'Content-Type': 'application/json' } : undefined,
      body: isSignup
        ? JSON.stringify({
            name,
            email,
            password,
            phone,
            address_line1: address?.line1,
            locality: address?.locality || undefined,
            city: address?.city,
            postcode: address?.postcode,
          })
        : new URLSearchParams({ username: email, password }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      const errorMessage = parseErrorMessage(errorText)
      throw new Error(errorMessage)
    }

    const data = await res.json()
    if (isSignup) {
      showSuccess('Account created successfully! Please login.')
      router.push('/login')
      return
    }

    setSession(data.access_token, data.user)
    showSuccess('Login successful! Welcome back.')
    router.push('/user/profile')
  }

  return <AuthHero mode="login" onSubmit={handleAuth} />
}
