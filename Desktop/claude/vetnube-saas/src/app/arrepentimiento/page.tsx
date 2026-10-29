import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { LegalPage } from '@/components/legal/legal-page'
import { requestWithdrawal } from './actions'

export const metadata: Metadata = { title: 'Botón de arrepentimiento' }

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100'

type SearchParams = Promise<{ codigo?: string; error?: string }>

export default async function ArrepentimientoPage({ searchParams }: { searchParams: SearchParams }) {
  const { codigo, error } = await searchParams

  return (
    <LegalPage title="Botón de arrepentimiento" updated="28 de octubre de 2026">
      <p>
        Si contrataste la suscripción hace 10 días corridos o menos, podés revocar la contratación sin costo y sin dar motivos (art. 34 de la
        Ley 24.240 y Resolución 424/2020). Cancelamos la suscripción y, si ya se hizo algún cobro, te lo devolvemos completo por el mismo medio
        de pago.
      </p>
      <p>
        Si pasaron más de 10 días, igual podés dar de baja la suscripción cuando quieras desde Configuración → Plan y facturación, o con este
        mismo formulario.
      </p>

      {codigo ? (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
          <p className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="size-5" aria-hidden />
            Recibimos tu solicitud
          </p>
          <p className="mt-2 text-sm">
            Tu código de solicitud es <b className="font-mono text-base tracking-wider">{codigo}</b>. Guardalo: te sirve para cualquier consulta
            sobre el pedido. Te escribimos al email que dejaste dentro de las 24 horas hábiles.
          </p>
        </div>
      ) : (
        <section className="rounded-2xl border border-line bg-white p-6">
          <h2 className="!pt-0">Pedir la revocación o la baja</h2>
          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}
          <form action={requestWithdrawal} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="full_name" className="text-sm font-bold text-muted">
                Nombre y apellido
              </label>
              <input id="full_name" name="full_name" required maxLength={120} autoComplete="name" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-bold text-muted">
                Email de la cuenta
              </label>
              <input id="email" name="email" type="email" required maxLength={160} autoComplete="email" className={inputClass} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="clinic_name" className="text-sm font-bold text-muted">
                Nombre de la clínica <span className="font-normal">(opcional)</span>
              </label>
              <input id="clinic_name" name="clinic_name" maxLength={120} className={inputClass} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="details" className="text-sm font-bold text-muted">
                Comentarios <span className="font-normal">(opcional)</span>
              </label>
              <textarea id="details" name="details" rows={3} maxLength={1000} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <button className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700">Enviar solicitud</button>
            </div>
          </form>
        </section>
      )}

      <p className="text-sm text-muted">
        Más información en los <Link href="/terminos">Términos y condiciones</Link>.
      </p>
    </LegalPage>
  )
}
