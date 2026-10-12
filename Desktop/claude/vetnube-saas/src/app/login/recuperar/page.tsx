import type { Metadata } from 'next'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { requestPasswordReset } from './actions'

export const metadata: Metadata = { title: 'Recuperar contraseña' }

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100'

export default async function RecuperarPage({ searchParams }: { searchParams: Promise<{ enviado?: string; error?: string }> }) {
  const { enviado, error } = await searchParams

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <BrandLogo subtitle="Gestión veterinaria en la nube" />

        <section className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
          {enviado ? (
            <div className="space-y-3 text-center">
              <MailCheck className="mx-auto size-10 text-brand-600" aria-hidden />
              <h1 className="font-display text-2xl font-bold">Revisá tu email</h1>
              <p className="text-sm text-muted">
                Si hay una cuenta con ese email, te enviamos un link para crear una contraseña nueva. Puede tardar unos minutos: revisá
                también la carpeta de spam.
              </p>
              <p className="text-sm text-muted">Abrí el link en este mismo navegador.</p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold">¿Olvidaste tu contraseña?</h1>
              <p className="mt-1 text-sm text-muted">Escribí el email con el que te registraste y te mandamos un link para crear una nueva.</p>

              {error && (
                <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  {error}
                </p>
              )}

              <form action={requestPasswordReset} className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-bold text-muted">
                    Email
                  </label>
                  <input id="email" name="email" type="email" required autoComplete="email" autoFocus className={inputClass} />
                </div>
                <button className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700">Enviarme el link</button>
              </form>
            </>
          )}
        </section>

        <p className="mt-5 text-center text-sm text-muted">
          <Link href="/login" className="font-bold text-brand-600 hover:underline">
            Volver a ingresar
          </Link>
        </p>
      </div>
    </main>
  )
}
