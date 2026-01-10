import { LogOut, Menu } from 'lucide-react'

import { useAuth } from '../context/AuthContext'

export default function Topbar({ onToggleSidebar }) {
  const { user, signOut } = useAuth()

  const logout = () => {
    signOut()
    window.location.href = '/admin/login'
  }

  return (
    <div className="sticky top-0 z-20 border-b border-secondary/10 bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof onToggleSidebar === 'function') {
                onToggleSidebar()
              }
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-secondary/30 text-secondary transition hover:bg-secondary hover:text-background lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-secondary">Admin workspace</p>
            <p className="text-sm font-semibold text-primary">
              {user?.email || 'Administrator'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 sm:flex-nowrap">
          {user && (
            <div className="hidden items-center gap-3 rounded-full border border-secondary/20 bg-white/50 px-4 py-2 text-xs text-secondary/80 md:inline-flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/20 text-[11px] font-semibold uppercase text-secondary">
                {user.email?.slice(0, 2).toUpperCase()}
              </span>
              <div className="text-left">
                <p className="font-semibold text-primary">{user.email}</p>
                <p className="text-[11px] text-secondary/70">{user.role || 'Admin'}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-secondary px-4 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary hover:text-background sm:w-auto"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
