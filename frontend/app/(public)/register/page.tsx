'use client'

import { useRouter } from 'next/navigation'

import AuthHero from '@/components/AuthHero'
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

export default function RegisterPage() {
  const router = useRouter()

  const handleAuth = async ({ name, phone, email, password, address }: AuthFormValues) => {
    if (!name || !phone || !address) {
      throw new Error('Please complete all required fields')
    }

    const res = await fetch(buildApiUrl('/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        password,
        phone,
        address_line1: address.line1,
        locality: address.locality || undefined,
        city: address.city,
        postcode: address.postcode,
      }),
    })

    if (!res.ok) {
      throw new Error(await res.text())
    }

    router.push('/login')
  }

  return <AuthHero mode="signup" onSubmit={handleAuth} />
}
