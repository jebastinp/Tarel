import Link from 'next/link'

import Breadcrumbs from '@/components/Breadcrumbs'
import { LEGAL_PAGES } from '@/lib/legalContent'

export const metadata = {
  title: 'Legal | Tarel',
  description: 'Explore Tarel\'s legal, privacy, and compliance information in one place.',
}

export default function LegalIndexPage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Legal' },
        ]}
      />

      <header className="space-y-3 rounded-3xl border border-brand-dark/10 bg-white/90 p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-dark/60">Legal hub</p>
        <h1 className="text-3xl font-semibold text-brand-dark">Policies, compliance, and customer assurances</h1>
        <p className="max-w-2xl text-sm text-brand-dark/70">
          Find the latest information about how we operate, protect your data, fulfil orders, and uphold safety standards across the United Kingdom.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {LEGAL_PAGES.map((page) => (
          <Link
            key={page.slug}
            href={`/legal/${page.slug}`}
            className="group flex h-full flex-col justify-between rounded-3xl border border-brand-dark/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="space-y-3">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-olive/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-dark/70">
                Last updated
                <span className="rounded-full bg-brand-dark px-2 py-0.5 text-[10px] font-semibold text-white">
                  {page.lastUpdated}
                </span>
              </span>
              <h2 className="text-xl font-semibold text-brand-dark">{page.title}</h2>
              {page.summary && <p className="text-sm text-brand-dark/70">{page.summary}</p>}
            </div>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-dark/80 transition group-hover:gap-3">
              View policy
              <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}
