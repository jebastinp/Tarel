'use client'

import { useState, useEffect } from 'react'
import type { Product } from '@/lib/types'
import { useToast } from '@/providers/ToastProvider'
import { buildApiUrl } from '@/lib/api'

export type CutCleanOption = string

export type CartItemWithOptions = {
  qty_kg: number
  cut_clean_option: CutCleanOption
  instructions: string[]
  custom_note: string
}

interface CutCleanOptionType {
  id: string
  label: string
  is_active: boolean
  sort_order: number
}

interface AddToCartModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
  onAddToCart: (product: Product, options: CartItemWithOptions) => void
}

export default function AddToCartModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
}: AddToCartModalProps) {
  const { showSuccess } = useToast()
  const [quantity, setQuantity] = useState<number>(1)
  const [cutCleanOption, setCutCleanOption] = useState<CutCleanOption>('No Cut and Clean')
  const [customNote, setCustomNote] = useState<string>('')
  const [cutCleanOptions, setCutCleanOptions] = useState<CutCleanOptionType[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  // Fetch cut & clean options from API
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetch(buildApiUrl('/products/cut-clean-options'))
        if (response.ok) {
          const data = await response.json()
          if (data && data.length > 0) {
            setCutCleanOptions(data)
            setCutCleanOption(data[0].label)
          } else {
            // Fallback to default options if API returns empty
            const defaultOptions = [
              { id: '1', label: 'No Cut and Clean', is_active: true, sort_order: 1 },
              { id: '2', label: 'Cut and Clean', is_active: true, sort_order: 2 },
              { id: '3', label: 'Thin Slice Cut', is_active: true, sort_order: 3 },
              { id: '4', label: 'Clean Only', is_active: true, sort_order: 4 },
              { id: '5', label: 'Cut & Clean - Keep the Head', is_active: true, sort_order: 5 },
              { id: '6', label: 'Cut & Clean - Head Removed', is_active: true, sort_order: 6 },
            ]
            setCutCleanOptions(defaultOptions)
            setCutCleanOption(defaultOptions[0].label)
          }
        } else {
          // Fallback if endpoint not available yet
          const defaultOptions = [
            { id: '1', label: 'No Cut and Clean', is_active: true, sort_order: 1 },
            { id: '2', label: 'Cut and Clean', is_active: true, sort_order: 2 },
            { id: '3', label: 'Thin Slice Cut', is_active: true, sort_order: 3 },
            { id: '4', label: 'Clean Only', is_active: true, sort_order: 4 },
            { id: '5', label: 'Cut & Clean - Keep the Head', is_active: true, sort_order: 5 },
            { id: '6', label: 'Cut & Clean - Head Removed', is_active: true, sort_order: 6 },
          ]
          setCutCleanOptions(defaultOptions)
          setCutCleanOption(defaultOptions[0].label)
        }
      } catch (error) {
        console.error('Failed to fetch cut & clean options:', error)
        // Fallback to default options
        const defaultOptions = [
          { id: '1', label: 'No Cut and Clean', is_active: true, sort_order: 1 },
          { id: '2', label: 'Cut and Clean', is_active: true, sort_order: 2 },
          { id: '3', label: 'Thin Slice Cut', is_active: true, sort_order: 3 },
          { id: '4', label: 'Clean Only', is_active: true, sort_order: 4 },
          { id: '5', label: 'Cut & Clean - Keep the Head', is_active: true, sort_order: 5 },
          { id: '6', label: 'Cut & Clean - Head Removed', is_active: true, sort_order: 6 },
        ]
        setCutCleanOptions(defaultOptions)
        setCutCleanOption(defaultOptions[0].label)
      } finally {
        setLoadingOptions(false)
      }
    }
    fetchOptions()
  }, [])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuantity(1)
      if (cutCleanOptions.length > 0) {
        setCutCleanOption(cutCleanOptions[0].label)
      }
      setCustomNote('')
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, cutCleanOptions])

  if (!isOpen) return null

  const handleQuantityChange = (value: string) => {
    const num = parseFloat(value)
    if (!isNaN(num) && num > 0) {
      setQuantity(num)
    }
  }

  const handleSubmit = () => {
    const options: CartItemWithOptions = {
      qty_kg: quantity,
      cut_clean_option: cutCleanOption,
      instructions: [],
      custom_note: customNote.trim(),
    }
    onAddToCart(product, options)
    showSuccess(`Added to cart: ${product.name} (${quantity} kg)`)
    onClose()
  }

  const totalPrice = quantity * product.price_per_kg

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative my-8 w-full max-w-2xl">
        <div className="relative flex max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex flex-shrink-0 items-center justify-between border-b bg-white p-4 sm:p-6">
          <div>
            <h2 className="text-xl font-bold text-brand-dark sm:text-2xl">{product.name}</h2>
            <p className="text-sm text-brand-dark/60">
              £{product.price_per_kg.toFixed(2)} per kg
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition hover:bg-gray-100"
            aria-label="Close modal"
          >
            <svg className="h-6 w-6 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 p-4 sm:p-6">
          {/* Quantity Selection */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand-dark">
              Quantity (kg) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(0.5, quantity - 0.5))}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-olive text-white transition hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={quantity <= 0.5}
              >
                -
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                min="0.5"
                max={product.stock_kg}
                step="0.5"
                className="w-24 rounded-lg border-2 border-brand-olive bg-white px-4 py-2 text-center text-lg font-semibold text-brand-dark focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-olive/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={() => setQuantity(Math.min(product.stock_kg, quantity + 0.5))}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-olive text-white transition hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={quantity >= product.stock_kg}
              >
                +
              </button>
            </div>
          </div>

          {/* Cut & Clean Options */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-brand-dark">
              Cut & Clean Preference <span className="text-red-500">*</span>
            </label>
            {loadingOptions ? (
              <p className="text-sm text-gray-500">Loading options...</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {cutCleanOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition ${
                      cutCleanOption === option.label
                        ? 'border-brand-olive bg-brand-olive/5'
                        : 'border-gray-200 hover:border-brand-olive/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cutClean"
                      value={option.label}
                      checked={cutCleanOption === option.label}
                      onChange={(e) => setCutCleanOption(e.target.value)}
                      className="h-4 w-4 text-brand-olive focus:ring-brand-olive"
                    />
                    <span className="text-sm font-medium text-brand-dark">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Special Instructions */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-brand-dark">
              Special Instructions <span className="text-xs text-brand-dark/60">(Optional)</span>
            </label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Add any special requests or preparation notes here..."
              rows={4}
              maxLength={500}
              className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-sm text-brand-dark placeholder:text-gray-400 focus:border-brand-olive focus:outline-none focus:ring-2 focus:ring-brand-olive/20"
            />
            <p className="mt-1 text-xs text-brand-dark/60">
              {customNote.length}/500 characters
            </p>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-brand-light/30 p-4">
            <h3 className="mb-2 text-sm font-semibold text-brand-dark">Order Summary</h3>
            <div className="space-y-1 text-sm text-brand-dark/80">
              <p>
                <span className="font-medium">Quantity:</span> {quantity.toFixed(1)} kg
              </p>
              <p>
                <span className="font-medium">Cut & Clean:</span>{' '}
                {CUT_CLEAN_OPTIONS.find((o) => o.value === cutCleanOption)?.label}
              </p>
              {customNote && (
                <p>
                  <span className="font-medium">Special Note:</span> {customNote}
                </p>
              )}
              <p className="pt-2 text-lg font-bold text-brand-dark">
                Total: £{totalPrice.toFixed(2)}
              </p>
            </div>
          </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex flex-shrink-0 flex-col gap-3 border-t bg-white p-4 sm:flex-row sm:p-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border-2 border-brand-dark px-6 py-3 font-semibold text-brand-dark transition hover:bg-brand-dark hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 rounded-full bg-brand-olive px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-brand-dark"
          >
            Add to Cart - £{totalPrice.toFixed(2)}
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}
