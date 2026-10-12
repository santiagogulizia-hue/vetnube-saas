import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BrandLogo } from '@/components/brand-logo'
import { getSession } from '@/lib/clinic'
import { createClinic } from './actions'

export const metadata: Metadata = { title: 'Alta de clínica' }

const TIMEZONES = [
  ['America/Argentina/Buenos_Aires', 'Argentina'],
  ['America/Montevideo', 'Uruguay'],
  ['America/Santiago', 'Chile'],
  ['America/Asuncion', 'Paraguay'],
  ['America/La_Paz', 'Bolivia'],
  ['America/Lima', 'Perú'],
  ['America/Bogota', 'Colombia'],
  ['America/Mexico_City', 'México'],
  ['Europe/Madrid', 'España'],
]

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100'

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user, clinic } = await getSession()
  if (clinic) redirect('/dashboard')
  const { error } = await searchParams

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <BrandLogo />
        <section className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
          <p className="text-xs font-bold tracking-widest text-brand-600 uppercase">Paso 1 de 1</p>
          <h1 className="mt-1 font-display text-2xl font-bold">Hola {user.fullName.split(' ')[0]}, creá tu clínica</h1>
          <p className="mt-1 text-sm text-muted">
            Vas a quedar como dueño/a. Después vas a poder invitar a tu equipo. Si te invitaron a una clínica que ya usa
            VetNube, no crees una nueva: abrí el link de invitación que te enviaron.
          </p>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}

          <form action={createClinic} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-bold text-muted">
                Nombre de la clínica
              </label>
              <input id="name" name="name" required placeholder="Ej.: Veterinaria San Roque" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="timezone" className="text-sm font-bold text-muted">
                País (zona horaria de la agenda)
              </label>
              <select id="timezone" name="timezone" className={inputClass} defaultValue={TIMEZONES[0][0]}>
                {TIMEZONES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
              Crear clínica
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
