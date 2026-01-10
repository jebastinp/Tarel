'use client'

import { useEffect, useState } from 'react'

import AdminGuard from '@/components/AdminGuard'
import { getToken } from '@/lib/auth'
import { buildApiUrl } from '@/lib/api'

interface SupportMessage {
  id: string
  subject: string
  message: string
  response?: string | null
  status: 'open' | 'pending' | 'closed'
  created_at: string
  user: {
    id: string
    name: string
    email: string
  }
}

const statuses: SupportMessage['status'][] = ['open', 'pending', 'closed']

export default function AdminSupport() {
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [activeMessage, setActiveMessage] = useState<SupportMessage | null>(null)
  const [response, setResponse] = useState('')
  const [status, setStatus] = useState<SupportMessage['status']>('pending')
  const token = getToken()

  const load = async () => {
    if (!token) return
    const res = await fetch(buildApiUrl('/admin/support/messages'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data: SupportMessage[] = await res.json()
      setMessages(data)
      if (!data.length) {
        setActiveMessage(null)
        return
      }
      if (activeMessage) {
        const next = data.find((msg) => msg.id === activeMessage.id)
        if (next) {
          setActiveMessage(next)
          setStatus(next.status)
          setResponse(next.response || '')
          return
        }
      }
      setActiveMessage(data[0])
      setStatus(data[0].status)
      setResponse(data[0].response || '')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const pickMessage = (message: SupportMessage) => {
    setActiveMessage(message)
    setResponse(message.response || '')
    setStatus(message.status)
  }

  const submit = async () => {
    if (!token || !activeMessage) return
    const params = new URLSearchParams({ status })
    if (response) params.set('response', response)
    await fetch(buildApiUrl(`/admin/support/messages/${activeMessage.id}?${params.toString()}`), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    await load()
  }

  return (
    <AdminGuard>
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <aside className="space-y-3">
          <h1 className="text-3xl font-semibold text-brand-dark">Support inbox</h1>
          <div className="space-y-2">
            {messages.map((message) => (
              <button
                key={message.id}
                onClick={() => pickMessage(message)}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  activeMessage?.id === message.id
                    ? 'border-brand-dark bg-brand-dark text-white'
                    : 'border-brand-dark/10 bg-white text-brand-dark hover:border-brand-dark/40'
                }`}
              >
                <p className="font-semibold">{message.subject}</p>
                <p className="text-xs opacity-70">{message.user.email}</p>
              </button>
            ))}
            {messages.length === 0 && <p className="text-sm text-brand-dark/60">No support messages yet.</p>}
          </div>
        </aside>

        {activeMessage ? (
          <section className="space-y-5 rounded-3xl border border-brand-dark/10 bg-white p-6 shadow-sm">
            <header className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-brand-dark/60">{activeMessage.status}</p>
              <h2 className="text-2xl font-semibold text-brand-dark">{activeMessage.subject}</h2>
              <p className="text-sm text-brand-dark/60">From {activeMessage.user.name} · {activeMessage.user.email}</p>
            </header>
            <article className="whitespace-pre-line rounded-2xl bg-brand-beige/50 p-4 text-sm text-brand-dark/80">
              {activeMessage.message}
            </article>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-brand-dark">Response</label>
              <textarea
                rows={4}
                value={response}
                onChange={(event) => setResponse(event.target.value)}
                className="w-full rounded-2xl border border-brand-dark/10 px-4 py-3 text-sm outline-none focus:border-brand-dark/40 focus:ring-2 focus:ring-brand-olive/30"
                placeholder="Type your reply"
              />
              <label className="block text-sm font-medium text-brand-dark">
                Status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as SupportMessage['status'])}
                  className="mt-2 w-full rounded-2xl border border-brand-dark/10 px-4 py-3 text-sm outline-none focus:border-brand-dark/40 focus:ring-2 focus:ring-brand-olive/30"
                >
                  {statuses.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn" onClick={submit}>
                Save response
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-dashed border-brand-dark/20 p-6 text-brand-dark/60">
            Select a message to review conversation details.
          </section>
        )}
      </div>
    </AdminGuard>
  )
}
