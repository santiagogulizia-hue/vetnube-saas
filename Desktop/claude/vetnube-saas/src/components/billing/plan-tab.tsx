import { CheckCircle2, RefreshCw } from 'lucide-react'
import { cancelSubscription, refreshSubscription, startSubscription } from '@/app/(clinic)/configuracion/billing-actions'
import { ConfirmSubmit } from '@/components/forms/buttons'
import { Card } from '@/components/ui/card'
import { Pill } from '@/components/ui/pill'
import { type BillingInfo, STATUS_LABEL, billingState } from '@/lib/billing'
import { formatDate, formatDateTime, formatMoney } from '@/lib/format'
import { syncPreapproval } from '@/lib/mercadopago'
import { canManageClinic, isOwner } from '@/lib/permissions'
import type { ServerSupabase } from '@/lib/supabase/server'
import type { Clinic } from '@/lib/types'
import { SubscribeForm } from './subscribe-form'

const EVENT_LABEL: Record<string, string> = {
  authorized: 'Suscripción autorizada',
  pending: 'Suscripción creada (falta autorizar)',
  paused: 'Suscripción pausada',
  cancelled: 'Suscripción cancelada',
  approved: 'Cobro aprobado',
  rejected: 'Cobro rechazado',
  scheduled: 'Cobro programado',
  processed: 'Cobro procesado',
  recycling: 'Reintentando cobro',
}

type Props = {
  supabase: ServerSupabase
  clinic: Clinic
  userEmail: string
  /** "volver" cuando el usuario regresa del checkout de Mercado Pago */
  mp?: string
}

/** Pestaña "Plan y facturación" de Configuración. */
export async function PlanTab({ supabase, clinic, userEmail, mp }: Props) {
  if (!canManageClinic(clinic.role)) {
    return <p className="rounded-lg bg-canvas px-4 py-3 text-sm text-muted ring-1 ring-line">La facturación la gestionan el dueño/a y administración.</p>
  }

  // Al volver del checkout se consulta el estado real, por si el webhook todavía no llegó
  let syncError: string | null = null
  if (mp === 'volver') {
    const { data: current } = await supabase.from('clinics').select('mp_preapproval_id').eq('id', clinic.id).single()
    if (current?.mp_preapproval_id) {
      try {
        await syncPreapproval(current.mp_preapproval_id as string)
      } catch {
        syncError = 'No pudimos confirmar el estado con Mercado Pago. Tocá «Actualizar estado» en unos minutos.'
      }
    }
  }

  const [{ data: billingData }, { data: eventsData }] = await Promise.all([
    supabase
      .from('clinics')
      .select('plan, subscription_status, trial_ends_at, next_billing_at, mp_preapproval_id, mp_payer_email')
      .eq('id', clinic.id)
      .single(),
    supabase.from('billing_events').select('id, topic, status, amount, created_at').eq('clinic_id', clinic.id).order('created_at', { ascending: false }).limit(10),
  ])
  const billing = billingData as BillingInfo & { mp_payer_email: string | null }
  const events = (eventsData ?? []) as { id: number; topic: string; status: string | null; amount: number | null; created_at: string }[]
  const s = billingState(billing)
  const owner = isOwner(clinic.role)
  const price = formatMoney(s.plan.price, s.plan.currency)

  return (
    <div className="space-y-5">
      {mp === 'volver' &&
        (s.active ? (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 className="size-4" aria-hidden />
            ¡Listo! Tu suscripción está activa. Gracias por elegir VetNube.
          </p>
        ) : (
          <p role="status" className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
            {syncError ?? 'Si completaste la autorización en Mercado Pago, el estado se actualiza en unos minutos.'}
          </p>
        ))}

      <Card title={s.plan.name}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-3xl font-bold tabular-nums">
              {price} <span className="text-sm font-normal text-muted">por mes</span>
            </p>
            <p className="mt-1 text-sm text-muted">Débito automático mensual con Mercado Pago. Cancelás cuando quieras.</p>
          </div>
          <Pill {...STATUS_LABEL[s.status]} />
        </div>

        <p className="mt-4 text-sm">
          {s.inTrial && (
            <>
              Prueba gratuita hasta el <b>{formatDate(billing.trial_ends_at)}</b> ({s.trialDaysLeft} {s.trialDaysLeft === 1 ? 'día' : 'días'}). Si
              te suscribís ahora, el primer cobro es al terminar la prueba.
            </>
          )}
          {s.trialExpired && <>Tu prueba gratuita terminó el {formatDate(billing.trial_ends_at)}.</>}
          {s.active && (
            <>
              Próximo débito: <b>{billing.next_billing_at ? formatDate(billing.next_billing_at) : 'según Mercado Pago'}</b>
              {billing.mp_payer_email && <> · cuenta {billing.mp_payer_email}</>}.
            </>
          )}
          {s.status === 'past_due' && <>El último cobro fue rechazado. Mercado Pago reintenta solo; revisá el saldo o el medio de pago de la cuenta.</>}
          {s.status === 'pending' && <>La suscripción está creada pero falta autorizar el pago en Mercado Pago.</>}
          {(s.status === 'cancelled' || s.status === 'paused') && (
            <>La suscripción está {s.status === 'paused' ? 'pausada' : 'cancelada'}. Podés volver a suscribirte cuando quieras.</>
          )}
        </p>

        <ul className="mt-4 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
          {s.plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-5 space-y-4 border-t border-line pt-5">
          {!s.active && owner && (
            <SubscribeForm
              action={startSubscription}
              defaultEmail={billing.mp_payer_email ?? userEmail}
              label={s.inTrial ? 'Suscribirme (sin cargo hasta que termine la prueba)' : `Suscribirme por ${price}/mes`}
            />
          )}
          {!s.active && !owner && <p className="text-sm text-muted">Solo el dueño/a de la clínica puede contratar el plan.</p>}

          <div className="flex flex-wrap gap-2">
            {billing.mp_preapproval_id && (
              <form action={refreshSubscription}>
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-bold hover:border-brand-500">
                  <RefreshCw className="size-4" aria-hidden />
                  Actualizar estado
                </button>
              </form>
            )}
            {s.active && owner && (
              <form action={cancelSubscription}>
                <ConfirmSubmit label="Cancelar suscripción" confirmLabel="Sí, cancelar débito automático" />
              </form>
            )}
          </div>
        </div>
      </Card>

      <Card title="Historial de facturación">
        {events.length === 0 ? (
          <p className="py-2 text-sm text-muted">Todavía no hay movimientos con Mercado Pago.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs tracking-wider text-muted uppercase">
                  <th className="px-5 py-2 font-bold">Fecha</th>
                  <th className="px-5 py-2 font-bold">Movimiento</th>
                  <th className="px-5 py-2 text-right font-bold">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="px-5 py-2.5 whitespace-nowrap text-muted tabular-nums">{formatDateTime(e.created_at, clinic.timezone)}</td>
                    <td className="px-5 py-2.5">{EVENT_LABEL[e.status ?? ''] ?? e.status ?? e.topic}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{e.amount != null ? formatMoney(Number(e.amount), s.plan.currency) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
