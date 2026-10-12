import type { Metadata } from 'next'
import Link from 'next/link'
import { BrandLogo } from '@/components/brand-logo'
import { createClient } from '@/lib/supabase/server'
import { updatePassword } from './actions'

export const metadata: Metadata = { title: 'Nueva contraseña' }

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100'

/** Pantalla a la que lleva el link del email de recuperación. */
export default async function NuevaClavePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <BrandLogo subtitle="Gestión veterinaria en la nube" />

        <section className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
          {!user ? (
            <div className="space-y-3">
              <h1 className="font-display text-2xl font-bold">El link venció</h1>
              <p className="text-sm text-muted">
                El link para cambiar la contraseña ya se usó o venció. También puede pasar si lo abriste en otro navegador distinto del que lo
                pediste.
              </p>
              <Link href="/login/recuperar" className="inline-block font-bold text-brand-600 hover:underline">
                Pedir un link nuevo
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold">Elegí una contraseña nueva</h1>
              <p className="mt-1 text-sm text-muted">Para {user.email}</p>

              {error && (
                <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  {error}
                </p>
              )}

              <form action={updatePassword} className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-bold text-muted">
                    Contraseña nueva
                  </label>
                  <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" autoFocus className={inputClass} />
                  <p className="text-xs text-muted">Mínimo 8 caracteres.</p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="confirm" className="text-sm font-bold text-muted">
                    Repetí la contraseña
                  </label>
                  <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
                </div>
                <button className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700">Guardar y entrar</button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
