import { useCallback, useEffect, useState } from 'react'

import Header from '../components/Header'
import Loading from '../components/Loading'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { exportToCsv } from '../utils/exportCsv'

const STATUS_OPTIONS = ['open', 'pending', 'closed']

export default function Support() {
  const { token, loading: authLoading, error: authError } = useAuth()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState({ response: '', status: 'pending' })
  const [activeId, setActiveId] = useState(null)
  const [initialising, setInitialising] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchMessages = useCallback(async () => {
    if (!token) return []
    const response = await api('/admin/support/messages', { token })
    const list = Array.isArray(response) ? response : []
    setMessages(list)
    if (list.length > 0 && !activeId) {
      setActiveId(list[0].id)
    }
    return list
  }, [token, activeId])

  useEffect(() => {
    if (!token) return
    let alive = true

    const load = async () => {
      setInitialising(true)
      setError('')
      try {
        await fetchMessages()
      } catch (err) {
        if (!alive) return
        console.error('Failed to load support messages', err)
        const message = err instanceof Error ? err.message : 'Unable to load support messages.'
        setError(message)
      } finally {
        if (alive) {
          setInitialising(false)
        }
      }
    }

    load()

    return () => {
      alive = false
    }
  }, [token, fetchMessages])

  const activeMessage = messages.find((message) => message.id === activeId) || null

  useEffect(() => {
    if (activeMessage) {
      setDraft({
        response: activeMessage.response || '',
        status: activeMessage.status
      })
    }
  }, [activeMessage?.id])

  const handleSave = async () => {
    if (!token || !activeMessage) return
    setSaving(true)
    setError('')
    try {
      await api(`/admin/support/messages/${activeMessage.id}`, {
        method: 'PATCH',
        token,
        body: {
          response: draft.response.trim() || null,
          status: draft.status
        }
      })
      await fetchMessages()
    } catch (err) {
      console.error('Failed to update support message', err)
      const message = err instanceof Error ? err.message : 'Unable to update support message.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || initialising) {
    return <Loading message="Loading support inbox…" />
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-primary">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <h1 className="text-xl font-semibold">Admin session required</h1>
          <p className="mt-3 text-sm text-primary/70">
            {authError || 'Set VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD in your environment to enable automatic dashboard access.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Support Inbox" />
      <section className="flex flex-1 flex-col gap-6 bg-background px-4 py-6 sm:px-6 lg:flex-row">
        <aside className="w-full space-y-4 rounded-3xl border border-background bg-white p-4 shadow lg:w-80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-primary">Conversations</h2>
            <button
              onClick={() => exportToCsv('support_messages.csv', messages)}
              className="text-xs text-secondary underline"
            >
              Export
            </button>
          </div>
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}
          <div className="space-y-2">
            {messages.map((message) => (
              <button
                key={message.id}
                onClick={() => setActiveId(message.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  message.id === activeId
                    ? 'border-secondary bg-secondary text-background'
                    : 'border-background/80 bg-white text-primary hover:border-secondary'
                }`}
              >
                <p className="font-medium">{message.subject}</p>
                <p className="text-xs opacity-70">{message.user?.email}</p>
                <p className="mt-1 text-xs uppercase tracking-widest opacity-70">{message.status}</p>
              </button>
            ))}
            {messages.length === 0 && <p className="text-sm text-secondary">No support tickets yet.</p>}
          </div>
        </aside>

  <div className="flex-1 rounded-3xl border border-background bg-white p-4 shadow sm:p-6">
          {activeMessage ? (
            <div className="space-y-4">
              <header>
                <p className="text-xs uppercase tracking-widest text-secondary">{activeMessage.status}</p>
                <h2 className="text-xl font-semibold text-primary">{activeMessage.subject}</h2>
                <p className="text-xs text-secondary">
                  From {activeMessage.user?.name || 'Unknown'} • {activeMessage.user?.email || 'No email'}
                </p>
              </header>
              <article className="rounded-2xl bg-background/70 p-4 text-sm text-primary">
                {activeMessage.message}
              </article>
              <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                <textarea
                  value={draft.response}
                  onChange={(event) => setDraft({ ...draft, response: event.target.value })}
                  placeholder="Write your response…"
                  className="min-h-[140px] rounded-2xl border border-secondary/30 px-4 py-3 text-sm focus:border-secondary focus:outline-none"
                />
                <div className="flex flex-col gap-3">
                  <select
                    value={draft.status}
                    onChange={(event) => setDraft({ ...draft, status: event.target.value })}
                    className="rounded-2xl border border-secondary/30 px-4 py-3 text-sm focus:border-secondary focus:outline-none"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-background transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save update'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-secondary">Choose a message to view its details.</p>
          )}
        </div>
      </section>
    </div>
  )
}
