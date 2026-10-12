'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { billingState, planFor } from '@/lib/billing'
import { requireClinic } from '@/lib/clinic'
import { failure, text } from '@/lib/form'
import type { FormState } from '@/lib/form-state'
import { withParam } from '@/lib/format'
import { appUrl, preapprovals, syncPreapproval } from '@/lib/mercadopago'
import { getOrigin } from '@/lib/origin'
import { canManageClinic, isOwner } from '@/lib/permissions'
import { createAdminClient } from '@/lib/supabase/admin'

const PLAN_TAB = '/configuracion?tab=plan'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Mensaje entendible a partir de un error del SDK de Mercado Pago. */
function mpError(error: unknown) {
  const e = error as { message?: string; cause?: { description?: string }[]; error?: string }
  const detail = e?.cause?.[0]?.description ?? e?.message ?? e?.error ?? 'Error desconocido'
  const testMode = process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith('TEST-') || process.env.MERCADOPAGO_TEST_MODE === 'true'
  if (/user bad request|invalid users|payer.*not found/i.test(detail)) {
    return 'Mercado Pago no encontró una cuenta con ese email. Revisá que sea exactamente el email de la cuenta que va a pagar (en modo prueba: el de tu comprador de prueba).'
  }
  if (/different site|payer.*collector|test user|both payer and collector|real or test/i.test(detail)) {
    return testMode || /different site/i.test(detail)
      ? 'Ese email es de una cuenta que no se puede usar acá: en modo prueba solo sirve un comprador de prueba de Argentina, distinto del vendedor.'
      : 'Mercado Pago rechazó el email del pagador: tiene que ser una cuenta distinta de la que cobra.'
  }
  if (/back_url/i.test(detail)) {
    return 'Mercado Pago rechazó la URL de regreso. Configurá NEXT_PUBLIC_APP_URL con una URL pública (https).'
  }
  return `Mercado Pago respondió: ${detail}`
}

/**
 * Crea la suscripción mensual (preapproval) y redirige al checkout de Mercado Pago.
 * El monto sale del plan definido en el servidor; la clínica, de la sesión.
 */
export async function startSubscription(_prev: FormState, fd: FormData): Promise<FormState> {
  const { clinic } = await requireClinic()
  if (!isOwner(clinic.role)) return failure(fd, 'Solo el dueño/a de la clínica puede contratar el plan.')

  const payerEmail = text(fd, 'payer_email')?.toLowerCase() ?? null
  if (!payerEmail || !EMAIL.test(payerEmail)) {
    return failure(fd, 'Revisá los campos marcados.', { payer_email: 'Ingresá el email de la cuenta de Mercado Pago que va a pagar.' })
  }

  const plan = planFor(clinic.plan)
  const state = billingState(clinic)
  // Si todavía quedan días de prueba, el primer cobro se hace al terminar la prueba
  const startDate = state.inTrial ? new Date(clinic.trial_ends_at).toISOString() : undefined
  const base = appUrl(await getOrigin())

  let initPoint: string | undefined
  try {
    const pre = await preapprovals().create({
      body: {
        reason: `VetNube · ${plan.name} · ${clinic.name}`.slice(0, 120),
        external_reference: clinic.id,
        payer_email: payerEmail,
        back_url: `${base}/configuracion?tab=plan&mp=volver`,
        status: 'pending',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: plan.price,
          currency_id: plan.currency,
          ...(startDate ? { start_date: startDate } : {}),
        },
      },
    })
    if (!pre.id || !pre.init_point) return failure(fd, 'Mercado Pago no devolvió el link de pago. Probá de nuevo.')

    // Se guarda como suscripción vigente; el webhook la marca "activa" cuando se autoriza
    await createAdminClient()
      .from('clinics')
      .update({ mp_preapproval_id: pre.id, mp_payer_email: payerEmail, subscription_updated_at: new Date().toISOString() })
      .eq('id', clinic.id)
    initPoint = pre.init_point
  } catch (error) {
    console.error('[mercadopago] create preapproval', error)
    return failure(fd, mpError(error))
  }

  redirect(initPoint)
}

/** Consulta a Mercado Pago el estado real (útil al volver del checkout o si el webhook no llegó). */
export async function refreshSubscription() {
  const { clinic } = await requireClinic()
  if (!canManageClinic(clinic.role)) redirect(withParam(PLAN_TAB, 'error', 'No tenés permiso para gestionar la facturación.'))

  const { data } = await createAdminClient().from('clinics').select('mp_preapproval_id').eq('id', clinic.id).single()
  if (!data?.mp_preapproval_id) redirect(withParam(PLAN_TAB, 'error', 'Todavía no hay una suscripción creada.'))

  try {
    await syncPreapproval(data.mp_preapproval_id)
  } catch (error) {
    redirect(withParam(PLAN_TAB, 'error', mpError(error)))
  }
  revalidatePath('/', 'layout')
  redirect(withParam(PLAN_TAB, 'ok', 'Estado actualizado desde Mercado Pago.'))
}

export async function cancelSubscription() {
  const { clinic } = await requireClinic()
  if (!isOwner(clinic.role)) redirect(withParam(PLAN_TAB, 'error', 'Solo el dueño/a puede cancelar la suscripción.'))

  const admin = createAdminClient()
  const { data } = await admin.from('clinics').select('mp_preapproval_id').eq('id', clinic.id).single()
  if (!data?.mp_preapproval_id) redirect(withParam(PLAN_TAB, 'error', 'No hay una suscripción para cancelar.'))

  try {
    await preapprovals().update({ id: data.mp_preapproval_id, body: { status: 'cancelled' } })
    await syncPreapproval(data.mp_preapproval_id)
  } catch (error) {
    redirect(withParam(PLAN_TAB, 'error', mpError(error)))
  }
  revalidatePath('/', 'layout')
  redirect(withParam(PLAN_TAB, 'ok', 'Suscripción cancelada. No se harán más débitos.'))
}
