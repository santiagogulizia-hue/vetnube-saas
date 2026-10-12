'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarPlus, LogOut, Menu } from 'lucide-react'
import { findNavItem } from './nav-items'

export type ShellUser = { name: string; email: string; roleLabel: string }

type Props = { user: ShellUser; menuOpen: boolean; onMenu: () => void }

export function Topbar({ user, menuOpen, onMenu }: Props) {
  const pathname = usePathname()
  const current = findNavItem(pathname)
  const initials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-20 flex items-center print:hidden gap-3 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <button
        onClick={onMenu}
        className="grid size-9 place-items-center rounded-lg border border-line bg-white text-muted lg:hidden"
        aria-label="Abrir menú"
        aria-controls="app-sidebar"
        aria-expanded={menuOpen}
      >
        <Menu className="size-5" />
      </button>

      <h1 className="font-display text-lg font-bold">{current?.label ?? 'VetNube'}</h1>

      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/agenda/nuevo"
          className="hidden items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white hover:bg-brand-700 sm:inline-flex"
        >
          <CalendarPlus className="size-4" aria-hidden />
          Nuevo turno
        </Link>

        <div className="hidden text-right md:block">
          <p className="text-sm leading-tight font-bold">{user.name}</p>
          <p className="text-xs text-muted">{user.roleLabel}</p>
        </div>
        <span
          className="grid size-9 place-items-center rounded-full bg-ink-900 text-sm font-bold text-white"
          title={user.email}
        >
          {initials || '?'}
        </span>

        <form action="/auth/signout" method="post">
          <button
            className="grid size-9 place-items-center rounded-lg border border-line bg-white text-muted hover:border-rose-200 hover:text-rose-600"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </header>
  )
}
