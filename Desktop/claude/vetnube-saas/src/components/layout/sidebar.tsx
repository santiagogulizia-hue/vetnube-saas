'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { NAV_SECTIONS, isActive } from './nav-items'

type Props = { clinicName: string; open: boolean; onClose: () => void }

export function Sidebar({ clinicName, open, onClose }: Props) {
  const pathname = usePathname()

  return (
    <>
      {/* Fondo oscuro detrás del menú en celulares */}
      {open && <div className="fixed inset-0 z-30 bg-ink-950/50 lg:hidden" onClick={onClose} aria-hidden />}

      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto bg-ink-900 px-3 py-5 text-ink-200 transition-transform duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 print:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-2 px-2 pb-6">
          <BrandLogo subtitle={clinicName} dark />
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav aria-label="Secciones" className="flex flex-col gap-5">
          {NAV_SECTIONS.map((section, i) => (
            <div key={section.title ?? i} className="flex flex-col gap-1">
              {section.title && (
                <p className="px-3 pb-1 text-[0.68rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
                  {section.title}
                </p>
              )}
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href)
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                      active ? 'bg-ink-700 text-white' : 'hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className={`size-[1.15rem] ${active ? 'text-brand-400' : ''}`} aria-hidden />
                    {label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <p className="mt-auto px-3 pt-6 text-xs text-ink-400">VetNube · MVP</p>
      </aside>
    </>
  )
}
