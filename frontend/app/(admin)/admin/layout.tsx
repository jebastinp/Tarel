import '../../globals.css'
import Link from 'next/link'

const links = [
  { href: '/admin/dashboard', label: 'Overview' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Category Management' },
  { href: '/admin/users', label: 'Customers' },
  { href: '/admin/purchase', label: 'Purchase' },
  { href: '/admin/support', label: 'Reports' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-brand-beige/40">
        <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-6">
          <nav className="flex flex-wrap items-center gap-3 rounded-3xl bg-white p-4 shadow">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-brand-dark/10 px-4 py-2 text-sm font-medium text-brand-dark transition hover:border-brand-dark hover:bg-brand-dark hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <section className="flex-1">{children}</section>
        </main>
      </body>
    </html>
  )
}
