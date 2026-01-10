'use client'

import { use, useEffect, useState } from 'react'

import { useCart } from '@/providers/CartProvider'
import { buildApiUrl } from '@/lib/api'

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = use(params)
  const [product, setProduct] = useState<any>(null)
  const { add } = useCart()

  useEffect(() => {
    ;(async () => {
  const res = await fetch(buildApiUrl(`/products/${slug}`))
      setProduct(await res.json())
    })()
  }, [slug])

  if (!product) return <div>Loading...</div>
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <img src={product.image_url || 'https://placehold.co/600x400'} className="rounded-2xl" alt={product.name} />
      <div className="space-y-3 card">
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-gray-600">{product.description || '—'}</p>
        <p className="text-xl">£{product.price_per_kg.toFixed(2)} / kg</p>
        <button className="btn" onClick={() => add(product, 1)}>
          Add 1 kg
        </button>
      </div>
    </div>
  )
}
