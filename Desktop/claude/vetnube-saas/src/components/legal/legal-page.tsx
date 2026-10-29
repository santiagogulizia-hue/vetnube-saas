import Link from 'next/link'
import { BrandLogo } from '@/components/brand-logo'
import { LEGAL_LINKS, SITE, contactLine } from '@/lib/site'

type Props = { title: string; updated: string; children: React.ReactNode }

/** Marco común de las páginas legales públicas (términos, privacidad, arrepentimiento). */
export function LegalPage({ title, updated, children }: Props) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" aria-label={`${SITE.name}, inicio`}>
            <BrandLogo />
          </Link>
          <Link href="/" className="text-sm font-bold text-brand-600 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="font-display text-3xl font-bold text-balance sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Última actualización: {updated}</p>
        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-fg/90 [&_a]:font-semibold [&_a]:text-brand-600 [&_a:hover]:underline [&_h2]:pt-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-fg [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
          {children}
        </div>
        <p className="mt-10 rounded-xl border border-line bg-white px-5 py-4 text-sm text-muted">¿Dudas? {contactLine()}</p>
      </main>

      <footer className="border-t border-line bg-white">
        <nav aria-label="Legales" className="mx-auto flex max-w-3xl flex-wrap gap-x-5 gap-y-2 px-4 py-5 text-xs text-muted sm:px-6">
          {LEGAL_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-fg" {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {l.label}
            </a>
          ))}
        </nav>
      </footer>
    </div>
  )
}
