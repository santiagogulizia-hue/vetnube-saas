'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { Topbar, type ShellUser } from './topbar'

type Props = { clinicName: string; user: ShellUser; banner?: React.ReactNode; children: React.ReactNode }

/** Estructura de la app: menú lateral fijo en escritorio, cajón desplegable en celulares. */
export function AppShell({ clinicName, user, banner, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar el menú al navegar o con Escape
  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] print:block">
      <Sidebar clinicName={clinicName} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-col">
        <Topbar user={user} menuOpen={menuOpen} onMenu={() => setMenuOpen(true)} />
        {banner}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
