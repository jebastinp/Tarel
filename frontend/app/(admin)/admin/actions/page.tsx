"use client"

import { useState } from "react"

import AdminGuard from "@/components/AdminGuard"
import { getToken } from "@/lib/auth"
import { buildApiUrl } from "@/lib/api"

const DEFAULT_EMAIL = process.env.NEXT_PUBLIC_REPORT_EMAIL || "admin@tarel.local"

type Notice =
  | { type: "idle"; message: "" }
  | { type: "success" | "error" | "info"; message: string }

export default function AdminActions() {
  const [email, setEmail] = useState(DEFAULT_EMAIL)
  const [notice, setNotice] = useState<Notice>({ type: "idle", message: "" })
  const [submitting, setSubmitting] = useState(false)

  const sendSalesReport = async () => {
    const token = getToken()
    if (!token) {
      setNotice({ type: "error", message: "Missing admin token. Please sign in again." })
      return
    }

    setSubmitting(true)
    setNotice({ type: "idle", message: "" })

    try {
      const res = await fetch(buildApiUrl("/admin/actions/send-sales-report"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      })

      if (res.status === 501) {
        const payload = await res.json().catch(() => ({ detail: "" }))
        setNotice({
          type: "info",
          message:
            payload.detail ||
            "Sales report email isn\u2019t available while the backend is running against the local SQLite fallback.",
        })
      } else if (res.ok) {
        const payload = await res.json()
        setNotice({ type: "success", message: `Sales report queued for ${payload.email}.` })
      } else {
        const text = await res.text()
        setNotice({ type: "error", message: text || "Failed to trigger sales report." })
      }
    } catch (err) {
      console.error("Failed to trigger sales report", err)
      setNotice({ type: "error", message: "Unexpected error triggering sales report." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-brand-dark">Operational actions</h1>
          <p className="text-sm text-brand-dark/60">
            Trigger backend automations and maintenance jobs for the marketplace.
          </p>
        </header>

        <section className="space-y-4 rounded-3xl bg-white p-6 shadow">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-brand-dark">Send monthly sales report</h2>
            <p className="text-sm text-brand-dark/60">
              Dispatch the Supabase stored procedure <code>rpc_send_sales_report_email</code> to email a fresh revenue
              CSV snapshot.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="flex-1 min-w-[220px] rounded-2xl border border-brand-dark/10 px-4 py-3 text-sm outline-none focus:border-brand-dark/40 focus:ring-2 focus:ring-brand-olive/30"
              placeholder="ops@tarel.co.uk"
            />
            <button
              className="btn"
              disabled={submitting}
              onClick={sendSalesReport}
            >
              {submitting ? "Sending…" : "Send sales report"}
            </button>
          </div>
          {notice.type !== "idle" && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                notice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : notice.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-brand-dark/10 bg-brand-olive/10 text-brand-dark"
              }`}
            >
              {notice.message}
            </div>
          )}
        </section>
      </div>
    </AdminGuard>
  )
}
