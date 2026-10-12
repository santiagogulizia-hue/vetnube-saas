'use client'

import { AlertTriangle } from 'lucide-react'

export default function ClinicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section role="alert" className="rounded-xl border border-rose-200 bg-white px-6 py-12 text-center">
      <AlertTriangle className="mx-auto size-8 text-rose-600" aria-hidden />
      <h2 className="mt-3 font-display text-xl font-bold">No pudimos cargar esta pantalla</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{error.message}</p>
      <button
        onClick={reset}
        className="mt-5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
      >
        Reintentar
      </button>
    </section>
  )
}
