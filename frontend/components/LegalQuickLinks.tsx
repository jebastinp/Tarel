'use client'

import Link from 'next/link'
import { useState } from 'react'

import { LEGAL_PAGES } from '@/lib/legalContent'

export default function LegalQuickLinks() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 text-sm md:bottom-8 md:right-8">
      {open && (
        <div
          id="legal-quick-links"
          className="w-72 max-w-sm overflow-hidden rounded-3xl border border-brand-dark/10 bg-white/95 p-4 shadow-2xl backdrop-blur"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-dark/60">Legal links</p>
          <ul className="mt-3 space-y-2">
            {LEGAL_PAGES.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/legal/${page.slug}`}
                  className="flex items-center justify-between rounded-2xl px-3 py-2 text-brand-dark/80 transition hover:bg-brand-beige/60 hover:text-brand-dark"
                  onClick={() => setOpen(false)}
                >
                  <span>{page.title}</span>
                  <span className="text-xs text-brand-dark/40">{page.lastUpdated}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/legal"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-dark/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-dark/70 transition hover:border-brand-dark hover:text-brand-dark"
            onClick={() => setOpen(false)}
          >
            View all policies
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
        aria-expanded={open}
        aria-controls="legal-quick-links"
      >
        {open ? 'Close legal menu' : 'Legal'}
      </button>
    </div>
  )
}
