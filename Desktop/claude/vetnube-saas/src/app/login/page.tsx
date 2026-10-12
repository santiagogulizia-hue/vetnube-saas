import type { Metadata } from 'next'
import Link from 'next/link'
import { BrandLogo } from '@/components/brand-logo'
import { signIn, signUp } from './actions'

export const metadata: Metadata = { title: 'Ingresar' }

type SearchParams = Promise<{ error?: string; message?: string; next?: string; modo?: string }>

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100'

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { error, message, next, modo } = await searchParams
  const isSignUp = modo === 'registro'

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <BrandLogo subtitle="Gestión veterinaria en la nube" />

        <section className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h1 className="font-display text-2xl font-bold">{isSignUp ? 'Crear cuenta' : 'Ingresar'}</h1>
          <p className="mt-1 text-sm text-muted">
            {isSignUp ? 'Registrate para dar de alta tu clínica.' : 'Accedé a la gestión de tu clínica.'}
          </p>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
              {message}
            </p>
          )}

          <form action={isSignUp ? signUp : signIn} className="mt-5 space-y-4">
            <input type="hidden" name="next" value={next ?? ''} />
            {isSignUp && (
              <div className="space-y-1.5">
                <label htmlFor="full_name" className="text-sm font-bold text-muted">
                  Nombre y apellido
                </label>
                <input id="full_name" name="full_name" required autoComplete="name" className={inputClass} />
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-bold text-muted">
                Email
              </label>
              <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-bold text-muted">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={isSignUp ? 8 : undefined}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className={inputClass}
              />
            </div>
            <button className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
              {isSignUp ? 'Crear cuenta' : 'Ingresar'}
            </button>
          </form>
        </section>

        <p className="mt-5 text-center text-sm text-muted">
          {isSignUp ? '¿Ya tenés cuenta?' : '¿Primera vez en VetNube?'}{' '}
          <Link href={`/login?${new URLSearchParams({ ...(isSignUp ? {} : { modo: 'registro' }), ...(next ? { next } : {}) })}`} className="font-bold text-brand-600 hover:underline">
            {isSignUp ? 'Ingresar' : 'Crear una cuenta'}
          </Link>
        </p>
      </div>
    </main>
  )
}
