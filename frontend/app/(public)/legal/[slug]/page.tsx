import { notFound } from 'next/navigation'

import Breadcrumbs from '@/components/Breadcrumbs'
import { LEGAL_PAGES, getLegalPage } from '@/lib/legalContent'

type LegalPageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return LEGAL_PAGES.map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: LegalPageProps) {
  const { slug } = await params
  const page = getLegalPage(slug)

  if (!page) {
    return {}
  }

  return {
    title: `${page.title} | Tarel`,
    description: page.summary ?? 'Latest legal information from Tarel.',
  }
}

export default async function LegalDetailPage({ params }: LegalPageProps) {
  const { slug } = await params
  const page = getLegalPage(slug)

  if (!page) {
    notFound()
  }

  return (
    <article className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Legal', href: '/legal' },
          { label: page.title },
        ]}
      />

      <header className="space-y-4 rounded-3xl border border-brand-dark/10 bg-white/90 p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-dark/60">{page.title}</p>
        <h1 className="text-3xl font-semibold text-brand-dark">{page.title}</h1>
        {page.summary && <p className="max-w-2xl text-sm text-brand-dark/70">{page.summary}</p>}
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-olive/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-dark/70">
          <span>Last updated</span>
          <span className="rounded-full bg-brand-dark px-2 py-0.5 text-[10px] font-semibold text-white">{page.lastUpdated}</span>
        </div>
      </header>

      <div className="space-y-10 rounded-3xl border border-brand-dark/10 bg-white p-8 shadow-sm">
        {page.sections.map((section) => (
          <section key={section.heading} className="space-y-4">
            <h2 className="text-xl font-semibold text-brand-dark">{section.heading}</h2>
            <div className="space-y-3 text-sm leading-relaxed text-brand-dark/80">
              {section.blocks.map((block, index) => {
                if (block.type === 'paragraph') {
                  return (
                    <p key={`${section.heading}-paragraph-${index}`}>{block.text}</p>
                  )
                }
                if (block.type === 'list') {
                  return (
                    <ul
                      key={`${section.heading}-list-${index}`}
                      className="ml-6 list-disc space-y-1 text-brand-dark/80"
                    >
                      {block.items.map((item, itemIndex) => (
                        <li key={`${section.heading}-list-${index}-item-${itemIndex}`}>{item}</li>
                      ))}
                    </ul>
                  )
                }
                return null
              })}
            </div>
          </section>
        ))}
      </div>
    </article>
  )
}
