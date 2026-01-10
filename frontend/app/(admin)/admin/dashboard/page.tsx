'use client'

import { useEffect, useState } from 'react'

import AdminGuard from '@/components/AdminGuard'
import { getToken } from '@/lib/auth'
import { buildApiUrl } from '@/lib/api'

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      const token = getToken()
      if (!token) return
  const res = await fetch(buildApiUrl('/admin/orders'), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setOrders(await res.json())
    })()
  }, [])

  return (
    <AdminGuard>
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
        {orders.map((order) => (
          <div key={order.id} className="card flex justify-between items-center">
            <div>
              <b>#{order.id}</b> £{order.total_amount.toFixed(2)} • {order.status} • {order.postcode}
            </div>
          </div>
        ))}
      </div>
    </AdminGuard>
  )
}
