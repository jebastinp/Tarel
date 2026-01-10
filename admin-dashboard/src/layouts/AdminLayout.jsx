import { useState } from 'react'

import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="relative flex min-h-screen bg-background text-primary">
      <Sidebar />
      <div className="flex w-full flex-1 flex-col">
        <Topbar onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 flex lg:hidden">
            <Sidebar isMobile onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}
    </div>
  )
}
