'use client'

import { useEffect, useState } from 'react'
import { buildApiUrl } from '@/lib/api'
import { getToken } from '@/lib/auth'

type OrderItem = {
  product_name: string
  quantity_kg: number
  cut_clean_option?: string
  custom_note?: string
}

type Order = {
  id: number
  order_code: string
  user: {
    name: string
    phone: string
    address_line1: string
    locality: string
    city: string
    postcode: string
  }
  items: OrderItem[]
  delivery_slot: string
  payment_method: string
  status: string
  delivery_date: string
  total_amount: number
}

type FishPurchaseData = {
  fishName: string
  totalQuantity: number
  orderCount: number
  processing: Record<string, number>
  specialNotes: string[]
}

export default function PurchaseDashboard() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [selectedDate])

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = getToken()
      const response = await fetch(buildApiUrl('/admin/orders'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch orders')

      const data = await response.json()
      // Filter orders by selected date
      const filteredOrders = data.filter((order: Order) => {
        const orderDate = new Date(order.delivery_date).toISOString().split('T')[0]
        return orderDate === selectedDate && order.status !== 'cancelled'
      })
      setOrders(filteredOrders)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getPurchaseReport = (): FishPurchaseData[] => {
    const fishMap = new Map<string, FishPurchaseData>()

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.product_name

        if (!fishMap.has(key)) {
          fishMap.set(key, {
            fishName: item.product_name,
            totalQuantity: 0,
            orderCount: 0,
            processing: {},
            specialNotes: [],
          })
        }

        const fish = fishMap.get(key)!
        fish.totalQuantity += item.quantity_kg
        fish.orderCount += 1

        const cutOption = item.cut_clean_option || 'No Cut and Clean'
        if (!fish.processing[cutOption]) {
          fish.processing[cutOption] = 0
        }
        fish.processing[cutOption] += item.quantity_kg

        if (item.custom_note && item.custom_note.trim()) {
          fish.specialNotes.push(item.custom_note)
        }
      })
    })

    return Array.from(fishMap.values())
  }

  const downloadPurchaseOrder = () => {
    const purchaseReport = getPurchaseReport()
    const totalQuantity = purchaseReport.reduce((sum, fish) => sum + fish.totalQuantity, 0)

    let content = `FISH PURCHASE ORDER - TAREL\n`
    content += `${'='.repeat(80)}\n`
    content += `Delivery Date: ${new Date(selectedDate).toLocaleDateString('en-GB')}\n`
    content += `Generated: ${new Date().toLocaleString('en-GB')}\n`
    content += `Total Orders: ${orders.length}\n`
    content += `Total Quantity Required: ${totalQuantity.toFixed(2)} kg\n`
    content += `\n${'='.repeat(80)}\n\n`

    content += `CONSOLIDATED PURCHASE LIST\n\n`

    purchaseReport.forEach((fish, idx) => {
      content += `${idx + 1}. Fish: ${fish.fishName}\n`
      content += `   Total Required: ${fish.totalQuantity.toFixed(2)} kg (${fish.orderCount} orders)\n`
      content += `   Recommended Purchase: ${(fish.totalQuantity * 1.15).toFixed(2)} kg (+15% buffer)\n\n`

      content += `   Processing Breakdown:\n`
      Object.entries(fish.processing).forEach(([type, qty]) => {
        content += `   • ${type}: ${qty.toFixed(2)} kg\n`
      })

      if (fish.specialNotes.length > 0) {
        content += `\n   Special Instructions:\n`
        fish.specialNotes.forEach((note, i) => {
          content += `   ${i + 1}. ${note}\n`
        })
      }

      content += `\n${'-'.repeat(80)}\n\n`
    })

    content += `\nDETAILED ORDER BREAKDOWN\n`
    content += `${'='.repeat(80)}\n\n`

    orders.forEach((order) => {
      content += `Order: ${order.order_code}\n`
      content += `Customer: ${order.user.name} | Phone: ${order.user.phone}\n`
      content += `Delivery: ${order.user.address_line1}, ${order.user.locality ? order.user.locality + ', ' : ''}${order.user.city}, ${order.user.postcode}\n`
      content += `Time Slot: ${order.delivery_slot}\n`
      content += `Payment: ${order.payment_method.toUpperCase()} | Status: ${order.status.toUpperCase()}\n`
      content += `Amount: £${order.total_amount.toFixed(2)}\n\n`

      content += `Items:\n`
      order.items.forEach((item) => {
        content += `  • ${item.product_name}\n`
        content += `    Qty: ${item.quantity_kg.toFixed(2)} kg | Processing: ${item.cut_clean_option || 'No Cut and Clean'}\n`
        if (item.custom_note) {
          content += `    Note: ${item.custom_note}\n`
        }
      })

      content += `\n${'-'.repeat(80)}\n\n`
    })

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Purchase_Order_${selectedDate}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const purchaseReport = getPurchaseReport()
  const totalQuantity = purchaseReport.reduce((sum, fish) => sum + fish.totalQuantity, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-brand-beige to-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-dark">Fish Purchase Dashboard</h1>
            <p className="mt-2 text-brand-dark/70">
              Consolidated purchase orders for procurement team
            </p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-olive text-white">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>
      </div>

      {/* Date Selector & Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl bg-white p-6 shadow">
          <label className="mb-2 block text-sm font-semibold text-brand-dark">
            Delivery Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-lg border-2 border-brand-olive bg-white px-4 py-2 text-brand-dark focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-olive/20"
          />
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-brand-olive to-brand-dark p-6 text-white shadow">
          <p className="text-sm font-medium opacity-90">Total Orders</p>
          <p className="mt-2 text-4xl font-bold">{orders.length}</p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-brand-dark to-gray-800 p-6 text-white shadow">
          <p className="text-sm font-medium opacity-90">Total Quantity</p>
          <p className="mt-2 text-4xl font-bold">
            {totalQuantity.toFixed(1)}
            <span className="ml-1 text-lg">kg</span>
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-brand-beige to-amber-100 p-6 shadow">
          <p className="text-sm font-semibold text-brand-dark/80">Fish Types</p>
          <p className="mt-2 text-4xl font-bold text-brand-dark">{purchaseReport.length}</p>
        </div>
      </div>

      {loading && (
        <div className="rounded-3xl bg-white p-12 text-center shadow">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-olive border-t-transparent"></div>
          <p className="mt-4 text-brand-dark/70">Loading orders...</p>
        </div>
      )}

      {error && (
        <div className="rounded-3xl bg-red-50 p-6 shadow">
          <p className="text-red-600">Error: {error}</p>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="rounded-3xl bg-white p-12 text-center shadow">
          <p className="text-lg text-brand-dark/70">No orders found for selected date</p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <>
          {/* Consolidated Purchase Report */}
          <div className="rounded-3xl bg-white p-6 shadow">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold text-brand-dark">Consolidated Purchase Report</h2>
              <button
                onClick={downloadPurchaseOrder}
                className="inline-flex items-center gap-2 rounded-full bg-brand-olive px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-brand-dark"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Purchase Order
              </button>
            </div>

            <div className="space-y-4">
              {purchaseReport.map((fish, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border-2 border-brand-beige bg-gradient-to-r from-white to-brand-beige/30 p-6 transition hover:shadow-lg"
                >
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Left Column */}
                    <div>
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-brand-dark">{fish.fishName}</h3>
                          <span className="mt-1 inline-block rounded-full bg-brand-olive/20 px-3 py-1 text-xs font-semibold text-brand-dark">
                            {fish.orderCount} orders
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-brand-dark/70">Total Required:</span>
                          <span className="text-2xl font-bold text-brand-dark">
                            {fish.totalQuantity.toFixed(2)} kg
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-brand-beige pt-3">
                          <span className="font-semibold text-brand-dark/70">Recommended Purchase:</span>
                          <span className="text-xl font-bold text-brand-olive">
                            {(fish.totalQuantity * 1.15).toFixed(2)} kg
                          </span>
                        </div>
                        <p className="text-right text-xs text-brand-dark/60">+15% buffer for quality rejection</p>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div>
                      <h4 className="mb-3 font-bold text-brand-dark">Processing Requirements:</h4>
                      <div className="mb-4 space-y-2">
                        {Object.entries(fish.processing).map(([type, qty], i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-lg bg-brand-beige/40 px-4 py-2"
                          >
                            <span className="text-sm font-medium text-brand-dark">{type}</span>
                            <span className="font-bold text-brand-dark">{qty.toFixed(2)} kg</span>
                          </div>
                        ))}
                      </div>

                      {fish.specialNotes.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-bold text-brand-dark">Special Instructions:</h4>
                          <ul className="space-y-1">
                            {fish.specialNotes.map((note, i) => (
                              <li key={i} className="flex items-start text-sm text-brand-dark/80">
                                <span className="mr-2 text-brand-olive">•</span>
                                {note}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Orders Table */}
          <div className="rounded-3xl bg-white p-6 shadow">
            <h2 className="mb-6 text-2xl font-bold text-brand-dark">Detailed Order Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-brand-dark bg-brand-beige">
                    <th className="p-3 text-left font-bold text-brand-dark">Order Code</th>
                    <th className="p-3 text-left font-bold text-brand-dark">Customer</th>
                    <th className="p-3 text-left font-bold text-brand-dark">Fish Items</th>
                    <th className="p-3 text-left font-bold text-brand-dark">Qty (kg)</th>
                    <th className="p-3 text-left font-bold text-brand-dark">Processing</th>
                    <th className="p-3 text-left font-bold text-brand-dark">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) =>
                    order.items.map((item, itemIdx) => (
                      <tr
                        key={`${order.id}-${itemIdx}`}
                        className="border-b border-brand-beige hover:bg-brand-beige/20"
                      >
                        {itemIdx === 0 && (
                          <>
                            <td className="p-3 font-semibold text-brand-olive" rowSpan={order.items.length}>
                              {order.order_code}
                            </td>
                            <td className="p-3" rowSpan={order.items.length}>
                              <div>
                                <p className="font-semibold text-brand-dark">{order.user.name}</p>
                                <p className="text-sm text-brand-dark/60">{order.user.phone}</p>
                                <p className="text-xs text-brand-dark/50">
                                  {order.delivery_slot}
                                </p>
                              </div>
                            </td>
                          </>
                        )}
                        <td className="p-3">
                          <p className="font-semibold text-brand-dark">{item.product_name}</p>
                          {item.custom_note && (
                            <p className="mt-1 text-xs text-brand-olive">📝 {item.custom_note}</p>
                          )}
                        </td>
                        <td className="p-3 font-bold text-brand-dark">{item.quantity_kg.toFixed(2)}</td>
                        <td className="p-3 text-sm text-brand-dark/80">
                          {item.cut_clean_option || 'No Cut and Clean'}
                        </td>
                        {itemIdx === 0 && (
                          <td className="p-3" rowSpan={order.items.length}>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                order.payment_method === 'card'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {order.payment_method.toUpperCase()}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
