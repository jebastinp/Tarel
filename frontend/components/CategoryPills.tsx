'use client'

import type { Category } from '@/lib/types'

export type CategoryPillsProps = {
  categories: Category[]
  selected?: string
  onSelect?: (slug: string) => void
}

export default function CategoryPills({ categories, selected, onSelect }: CategoryPillsProps) {
  const items: Category[] = [{ id: 'all', name: 'All', slug: 'all' }, ...categories]

  return (
    <div className="relative">
  <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-brand-dark">Browse by category</h2>
        <p className="text-sm text-brand-dark/60">Choose what you crave today</p>
      </div>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {items.map((category) => {
          const isActive = selected ? selected === category.slug : category.slug === 'all'
          const firstLetter = category.name.charAt(0).toUpperCase()
          return (
            <button
              key={category.slug}
              type="button"
              onClick={() => onSelect?.(category.slug)}
              className={`flex min-w-[120px] flex-col items-center gap-3 rounded-2xl border px-4 py-4 transition-all hover:-translate-y-1 ${
                isActive
                  ? 'border-brand-dark bg-brand-dark text-white shadow-lg'
                  : 'border-brand-dark/10 bg-white text-brand-dark shadow-sm hover:shadow-lg'
              }`}
            >
              <span className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold ${
                isActive ? 'bg-white/20 text-white' : 'bg-brand-olive/10 text-brand-dark'
              }`}>
                {firstLetter}
              </span>
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
