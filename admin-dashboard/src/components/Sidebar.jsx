import { BarChart3, ClipboardList, LayoutGrid, Package, ShoppingCart, Tags, UsersRound, X, FileText, Scissors } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/admin/dashboard', label: 'Overview', icon: LayoutGrid },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Category Management', icon: Tags },
  { to: '/admin/cut-clean-options', label: 'Cut & Clean Options', icon: Scissors },
  { to: '/admin/customers', label: 'Customers', icon: UsersRound },
  { to: '/admin/purchase', label: 'Purchase', icon: ShoppingCart },
  { to: '/admin/vendor-report', label: 'Vendor Report', icon: FileText },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 }
]

export default function Sidebar({ isMobile = false, onClose }) {
  const containerClasses = isMobile
    ? 'flex h-full w-72 max-w-[calc(100vw-3rem)] flex-col bg-primary text-background shadow-2xl'
    : 'hidden h-screen w-64 flex-col bg-primary text-background lg:sticky lg:top-0 lg:flex';

  return (
    <aside className={containerClasses}>
      <div className="flex items-start justify-between border-b border-white/10 p-6">
        <div>
          <p className="text-lg font-semibold tracking-wide">Tarel Admin</p>
          <p className="mt-1 text-xs text-background/70">
            Administrative dashboard
          </p>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-background transition hover:bg-white/10"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => {
              if (isMobile && typeof onClose === 'function') {
                onClose()
              }
            }}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-secondary text-primary shadow-sm'
                  : 'text-background/80 hover:bg-secondary/20 hover:text-background'
              }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4 text-xs text-background/60">
        <p>© {new Date().getFullYear()} Tarel</p>
        <p className="mt-1">Edinburgh, Scotland</p>
      </div>
    </aside>
  )
}
