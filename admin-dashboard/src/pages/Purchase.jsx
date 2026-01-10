import { useCallback, useEffect, useState } from 'react'
import { Download, Package } from 'lucide-react'

import Header from '../components/Header'
import Loading from '../components/Loading'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

export default function Purchase() {
  const { token } = useAuth()
  const [selectedDate, setSelectedDate] = useState('')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch next delivery date on mount
  useEffect(() => {
    if (!token) return
    
    const fetchNextDelivery = async () => {
      try {
        const response = await api('/admin/site/next-delivery', { token })
        if (response?.scheduled_for) {
          setSelectedDate(response.scheduled_for)
        } else {
          // Fallback to today if no delivery scheduled
          const today = new Date()
          setSelectedDate(today.toISOString().split('T')[0])
        }
      } catch (err) {
        console.error('Failed to load next delivery date', err)
        // Fallback to today
        const today = new Date()
        setSelectedDate(today.toISOString().split('T')[0])
      }
    }

    fetchNextDelivery()
  }, [token])

  const fetchOrders = useCallback(async () => {
    if (!token || !selectedDate) return
    setLoading(true)
    setError('')
    try {
      const response = await api('/admin/orders', { token })
      const allOrders = Array.isArray(response) ? response : []
      
      // Filter orders with delivery date on or before selected date
      const selectedDateTime = new Date(selectedDate + 'T23:59:59').getTime()
      
      const filteredOrders = allOrders.filter((order) => {
        if (order.status === 'cancelled') return false
        try {
          const orderDateTime = new Date(order.delivery_date + 'T23:59:59').getTime()
          return orderDateTime <= selectedDateTime
        } catch (err) {
          console.error('Invalid delivery_date for order:', order.id, err)
          return false
        }
      })
      
      setOrders(filteredOrders)
    } catch (err) {
      console.error('Failed to load orders', err)
      setError(err instanceof Error ? err.message : 'Unable to load orders.')
    } finally {
      setLoading(false)
    }
  }, [token, selectedDate])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const getPurchaseReport = () => {
    const fishMap = new Map()

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

        const fish = fishMap.get(key)
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

  if (loading) {
    return <Loading />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-primary">Fish Purchase Dashboard</h1>
          <p className="mt-1 text-sm text-primary/60">All orders with delivery on or before selected date</p>
        </div>
        {orders.length > 0 && (
          <button
            onClick={downloadPurchaseOrder}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3"
          >
            <Download size={20} />
            Download Purchase Order
          </button>
        )}
      </div>

      {/* Date Selector & Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="relative overflow-hidden rounded-3xl bg-secondary p-6 text-background shadow-xl transition-all hover:shadow-2xl">
          <div className="absolute right-0 top-0 h-28 w-28 translate-x-6 -translate-y-6 rounded-full bg-background/10"></div>
          <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-4 translate-y-4 rounded-full bg-background/10"></div>
          <div className="relative">
            <div className="mb-3 inline-flex items-center justify-center rounded-2xl bg-background/20 p-3 backdrop-blur-sm">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="mb-1 text-sm font-medium text-background/80">Delivery Date</p>
            <p className="mb-2 text-xs font-medium text-background/60">Orders up to this date</p>
            <div className="space-y-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border-2 border-background/30 bg-background/20 px-4 py-2 text-lg font-bold text-background placeholder-background/50 backdrop-blur-sm transition-all focus:border-background/50 focus:bg-background/30 focus:outline-none"
              />
              <button
                onClick={fetchOrders}
                disabled={loading || !selectedDate}
                className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-bold text-background transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Fetch Orders'}
              </button>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-background shadow-xl transition-all hover:shadow-2xl">
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-background/10"></div>
          <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-6 translate-y-6 rounded-full bg-background/10"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-background/80">Total Orders</p>
              <p className="mt-2 text-5xl font-extrabold tracking-tight">{orders.length}</p>
              <p className="mt-1 text-xs font-medium text-background/70">Active deliveries</p>
            </div>
            <div className="rounded-2xl bg-background/20 p-4 backdrop-blur-sm">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-secondary p-6 text-background shadow-xl transition-all hover:shadow-2xl">
          <div className="absolute right-0 top-0 h-28 w-28 translate-x-6 -translate-y-6 rounded-full bg-background/10"></div>
          <div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-8 translate-y-8 rounded-full bg-background/10"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-background/80">Total Quantity</p>
              <p className="mt-2 text-5xl font-extrabold tracking-tight">
                {totalQuantity.toFixed(1)}
                <span className="ml-2 text-2xl font-bold">kg</span>
              </p>
              <p className="mt-1 text-xs font-medium text-background/70">Fish to procure</p>
            </div>
            <div className="rounded-2xl bg-background/20 p-4 backdrop-blur-sm">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-primary p-6 text-background shadow-xl transition-all hover:shadow-2xl">
          <div className="absolute right-0 top-0 h-36 w-36 translate-x-10 -translate-y-10 rounded-full bg-background/10"></div>
          <div className="absolute bottom-0 left-0 h-20 w-20 -translate-x-4 translate-y-4 rounded-full bg-background/10"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-background/80">Fish Types</p>
              <p className="mt-2 text-5xl font-extrabold tracking-tight">{purchaseReport.length}</p>
              <p className="mt-1 text-xs font-medium text-background/70">Unique varieties</p>
            </div>
            <div className="rounded-2xl bg-background/20 p-4 backdrop-blur-sm">
              <Package size={40} strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="card border-l-4 border-red-500 bg-red-50 text-red-700">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">Error: {error}</p>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card text-center py-16">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/5">
            <Package className="h-12 w-12 text-primary/30" />
          </div>
          <h3 className="text-xl font-semibold text-primary">No orders scheduled</h3>
          <p className="mt-2 text-primary/60">No orders found for the selected delivery date</p>
          <p className="mt-1 text-sm text-primary/50">Try selecting a different date</p>
        </div>
      ) : (
        <>
          {/* Consolidated Purchase Report */}
          <div className="card space-y-6">
            <div className="border-b border-primary/10 pb-4">
              <h2 className="text-2xl font-bold text-primary">Consolidated Purchase Report</h2>
              <p className="mt-1 text-sm text-primary/60">Summary of fish requirements grouped by type</p>
            </div>

            <div className="space-y-5">
              {purchaseReport.map((fish, idx) => (
                <div
                  key={idx}
                  className="group rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-background via-background to-secondary/10 p-6 shadow-lg transition-all hover:border-primary/30 hover:shadow-xl"
                >
                  <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                    {/* Left Column - Summary */}
                    <div>
                      <div className="mb-4">
                        <div className="mb-3 flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-background shadow-lg">
                            <span className="text-xl font-bold">{idx + 1}</span>
                          </div>
                          <h3 className="text-2xl font-bold text-primary">{fish.fishName}</h3>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-1.5 text-xs font-bold text-background shadow-md">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {fish.orderCount} {fish.orderCount === 1 ? 'order' : 'orders'}
                        </span>
                      </div>

                      <div className="space-y-4 rounded-2xl border-2 border-primary/10 bg-white p-6 shadow-lg">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-bold text-primary/70">Total Required:</span>
                          <span className="text-4xl font-extrabold text-primary">
                            {fish.totalQuantity.toFixed(2)} <span className="text-xl">kg</span>
                          </span>
                        </div>
                        <div className="h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-bold text-primary/70">Recommended:</span>
                          <span className="text-3xl font-extrabold text-secondary">
                            {(fish.totalQuantity * 1.15).toFixed(2)} <span className="text-lg">kg</span>
                          </span>
                        </div>
                        <div className="rounded-lg bg-secondary/10 px-3 py-2">
                          <p className="text-center text-xs font-semibold text-secondary">
                            <span className="inline-flex items-center gap-1">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              +15% buffer for quality rejection
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Details */}
                    <div className="space-y-5">
                      <div>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary/70">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                          </svg>
                          Processing Requirements
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(fish.processing).map(([type, qty], i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between rounded-lg border border-primary/10 bg-secondary/20 px-4 py-3 transition-colors hover:bg-secondary/30"
                            >
                              <span className="text-sm font-medium text-primary">{type}</span>
                              <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-background">
                                {qty.toFixed(2)} kg
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {fish.specialNotes.length > 0 && (
                        <div>
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary/70">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Special Instructions
                          </h4>
                          <div className="space-y-2 rounded-lg border border-accent/20 bg-accent/5 p-4">
                            {fish.specialNotes.map((note, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm text-primary">
                                <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                                  {i + 1}
                                </span>
                                <span className="flex-1">{note}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Orders Table */}
          <div className="card space-y-6">
            <div className="border-b border-primary/10 pb-4">
              <h2 className="text-2xl font-bold text-primary">Detailed Order Breakdown</h2>
              <p className="mt-1 text-sm text-primary/60">Complete order-by-order view with customer details</p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-primary/10">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-primary/20 bg-gradient-to-r from-secondary to-secondary/80">
                    <th className="whitespace-nowrap p-4 text-left text-xs font-bold uppercase tracking-wider text-primary">Order Code</th>
                    <th className="whitespace-nowrap p-4 text-left text-xs font-bold uppercase tracking-wider text-primary">Customer Details</th>
                    <th className="whitespace-nowrap p-4 text-left text-xs font-bold uppercase tracking-wider text-primary">Fish Items</th>
                    <th className="whitespace-nowrap p-4 text-left text-xs font-bold uppercase tracking-wider text-primary">Quantity</th>
                    <th className="whitespace-nowrap p-4 text-left text-xs font-bold uppercase tracking-wider text-primary">Processing</th>
                    <th className="whitespace-nowrap p-4 text-left text-xs font-bold uppercase tracking-wider text-primary">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {orders.map((order) =>
                    order.items.map((item, itemIdx) => (
                      <tr
                        key={`${order.id}-${itemIdx}`}
                        className="transition-colors hover:bg-secondary/5"
                      >
                        {itemIdx === 0 && (
                          <>
                            <td className="p-4" rowSpan={order.items.length}>
                              <span className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 font-mono text-sm font-bold text-accent">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                </svg>
                                {order.order_code}
                              </span>
                            </td>
                            <td className="p-4" rowSpan={order.items.length}>
                              <div className="space-y-1">
                                <p className="font-semibold text-primary">{order.user.name}</p>
                                <p className="flex items-center gap-1 text-sm text-primary/70">
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  {order.user.phone}
                                </p>
                                <p className="flex items-center gap-1 text-xs text-primary/60">
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {order.delivery_slot}
                                </p>
                              </div>
                            </td>
                          </>
                        )}
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-primary">{item.product_name}</p>
                            {item.custom_note && (
                              <div className="mt-2 flex items-start gap-2 rounded-md bg-accent/5 p-2">
                                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                                <span className="text-xs text-primary/80">{item.custom_note}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 font-mono text-sm font-bold text-primary">
                            {item.quantity_kg.toFixed(2)} kg
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="inline-block rounded-md border border-secondary bg-secondary/20 px-3 py-1 text-xs font-medium text-primary">
                            {item.cut_clean_option || 'No Cut and Clean'}
                          </span>
                        </td>
                        {itemIdx === 0 && (
                          <td className="p-4" rowSpan={order.items.length}>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${
                                order.payment_method === 'card'
                                  ? 'bg-green-100 text-green-800 ring-1 ring-green-200'
                                  : 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200'
                              }`}
                            >
                              {order.payment_method === 'card' ? (
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                              ) : (
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              )}
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
