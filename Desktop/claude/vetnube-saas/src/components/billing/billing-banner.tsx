import Link from 'next/link'
import { AlertTriangle, Clock } from 'lucide-react'
import { type BillingInfo, billingState } from '@/lib/billing'

const PLAN_URL = '/configuracion?tab=plan'

/**
 * Aviso arriba de todas las pantallas: últimos días de prueba, modo solo lectura
 * (prueba vencida o suscripción terminada) o cobro rechazado. Con la suscripción activa no se muestra nada.
 */
export function BillingBanner({ billing, canManage }: { billing: BillingInfo; canManage: boolean }) {
  const s = billingState(billing)
  const cta = canManage ? (
    <Link href={PLAN_URL} className="shrink-0 rounded-md bg-white/90 px-3 py-1 text-xs font-bold text-fg ring-1 ring-black/10 hover:bg-white">
      Ver plan
    </Link>
  ) : null

  let tone = ''
  let icon = <Clock className="size-4 shrink-0" aria-hidden />
  let message = ''

  if (s.inTrial && s.trialDaysLeft <= 7) {
    tone = 'bg-amber-50 text-amber-900 border-amber-200'
    message = `Te ${s.trialDaysLeft === 1 ? 'queda 1 día' : `quedan ${s.trialDaysLeft} días`} de prueba gratuita.${canManage ? ' Suscribite para no perder el acceso.' : ''}`
  } else if (s.readOnly) {
    tone = 'bg-rose-50 text-rose-800 border-rose-200'
    icon = <AlertTriangle className="size-4 shrink-0" aria-hidden />
    const reason = s.trialExpired ? 'Terminó el período de prueba' : 'La suscripción no está vigente'
    message = canManage
      ? `${reason}: podés ver tus datos, pero no cargar ni modificar nada. Suscribite para seguir usando VetNube.`
      : `${reason}: la clínica está en modo solo lectura. Avisale al dueño/a.`
  } else if (s.status === 'past_due') {
    tone = 'bg-rose-50 text-rose-800 border-rose-200'
    icon = <AlertTriangle className="size-4 shrink-0" aria-hidden />
    message = 'Mercado Pago no pudo cobrar el plan. Revisá el medio de pago para evitar la suspensión.'
  } else if (s.status === 'cancelled' || s.status === 'paused') {
    tone = 'bg-slate-100 text-slate-700 border-slate-200'
    message = `La suscripción está ${s.status === 'paused' ? 'pausada' : 'cancelada'}. Podés seguir usando VetNube hasta el fin del período pagado.`
  } else {
    return null
  }

  return (
    <div role="status" className={`flex items-center justify-between gap-3 border-b px-4 py-2 text-sm sm:px-6 lg:px-8 print:hidden ${tone}`}>
      <p className="flex items-center gap-2 font-semibold">
        {icon}
        {message}
      </p>
      {cta}
    </div>
  )
}
