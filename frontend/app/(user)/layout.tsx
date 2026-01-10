import type { ReactNode } from 'react'

import '../globals.css'
import AppShell from '@/components/AppShell'

export default function UserLayout({ children }: { children: ReactNode }) {
  return <AppShell guard mode="user">{children}</AppShell>
}
