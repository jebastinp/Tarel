import Link from 'next/link'

type BreadcrumbItem = {
  label: string
  href?: string
}

type BreadcrumbsProps = {
  items: BreadcrumbItem[]
  className?: string
}

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-brand-dark/60">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="font-medium text-brand-dark/70 transition hover:text-brand-dark"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-semibold text-brand-dark">{item.label}</span>
              )}
              {!isLast && <span aria-hidden="true" className="text-brand-dark/30">/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
