'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'

type Props = { links: { href: string; label: string }[]; loggedIn: boolean }

export function LandingHeader({ links, loggedIn }: Props) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
        scrolled || open ? 'border-b border-line bg-white/95 backdrop-blur' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="VetNube, inicio" onClick={() => setOpen(false)}>
          <BrandLogo />
        </Link>

        <nav aria-label="Secciones" className="ml-4 hidden gap-6 text-sm font-semibold text-muted md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-fg">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {loggedIn ? (
            <Link href="/dashboard" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">
              Ir a mi clínica
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-bold text-fg hover:bg-brand-50">
                Iniciar sesión
              </Link>
              <Link href="/login?modo=registro" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">
                Probar gratis
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto grid size-10 place-items-center rounded-lg border border-line bg-white md:hidden"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          aria-controls="landing-mobile-nav"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav id="landing-mobile-nav" aria-label="Secciones" className="border-t border-line bg-white px-4 pt-2 pb-5 md:hidden">
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block py-3 font-semibold">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid gap-2">
            {loggedIn ? (
              <Link href="/dashboard" className="rounded-lg bg-brand-600 py-3 text-center font-bold text-white">
                Ir a mi clínica
              </Link>
            ) : (
              <>
                <Link href="/login?modo=registro" className="rounded-lg bg-brand-600 py-3 text-center font-bold text-white">
                  Probar gratis 14 días
                </Link>
                <Link href="/login" className="rounded-lg border border-line py-3 text-center font-bold">
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
