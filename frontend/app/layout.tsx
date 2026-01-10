import './globals.css'
import type { Metadata } from 'next'

import { AuthProvider } from '@/providers/AuthProvider'

export const metadata: Metadata = {
  title: 'Tarel',
  description: 'Edinburgh fish & dry fish delivery',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
