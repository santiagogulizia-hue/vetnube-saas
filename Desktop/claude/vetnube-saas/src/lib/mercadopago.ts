import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { Invoice, MercadoPagoConfig, PreApproval } from 'mercadopago'
import { mapPreapprovalStatus } from '@/lib/billing'
import { createAdminClient } from '@/lib/supabase/admin'

function config() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) throw new Error('Falta MERCADOPAGO_ACCESS_TOKEN en .env.local.')
  return new MercadoPagoConfig({ accessToken, options: { timeout: 10_000 } })
}

export const preapprovals = () => new PreApproval(config())
export const invoices = () => new Invoice(config())

/** URL pública de la app (Mercado Pago necesita una URL accesible para el regreso). */
export function appUrl(fallbackOrigin: string) {
  const raw = process.env.NEXT_PUBLIC_APP_URL || fallbackOrigin
  return (raw.startsWith('http') ? raw : `https://${raw}`).replace(/\/$/, '')
}

async function logEvent(event: {
  clinic_id: string | null
  topic: string
  resource_id: string
  status: string | null
  amount?: number | null
  payload: unknown
}) {
  const admin = createAdminClient()
  // Idempotente: Mercado Pago reenvía la misma notificación varias veces
  await admin.from('billing_events').upsert(
    { provider: 'mercadopago', ...event, amount: event.amount ?? null, payload: event.payload as object },
    { onConflict: 'provider,topic,resource_id,status', ignoreDuplicates: true },
  )
}

/**
 * Lee la suscripción en Mercado Pago (nunca confiamos en el cuerpo de la
 * notificación) y actualiza el estado de la clínica indicada en external_reference.
 */
export async function syncPreapproval(preapprovalId: string) {
  const pre = await preapprovals().get({ id: preapprovalId })
  const clinicId = pre.external_reference ?? null
  const mapped = mapPreapprovalStatus(pre.status)

  await logEvent({
    clinic_id: clinicId,
    topic: 'subscription_preapproval',
    resource_id: preapprovalId,
    status: pre.status ?? null,
    amount: pre.auto_recurring?.transaction_amount ?? null,
    payload: { status: pre.status, next_payment_date: pre.next_payment_date, payer_email: pre.payer_email, reason: pre.reason },
  })
  if (!clinicId || !mapped) return { clinicId, status: mapped }

  const admin = createAdminClient()
  const { data: clinic } = await admin
    .from('clinics')
    .select('id, subscription_status, mp_preapproval_id')
    .eq('id', clinicId)
    .maybeSingle()
  if (!clinic) return { clinicId: null, status: mapped }

  const isCurrent = clinic.mp_preapproval_id === preapprovalId
  const update: Record<string, unknown> = { subscription_updated_at: new Date().toISOString() }

  if (mapped === 'active') {
    // Una suscripción autorizada pasa a ser la vigente de la clínica
    Object.assign(update, {
      subscription_status: 'active',
      mp_preapproval_id: preapprovalId,
      mp_payer_email: pre.payer_email ?? null,
      next_billing_at: pre.next_payment_date ?? null,
    })
  } else if (isCurrent && mapped !== 'pending') {
    // Pausa o cancelación de la suscripción vigente
    update.subscription_status = mapped
  } else if (isCurrent && mapped === 'pending' && clinic.subscription_status !== 'trial') {
    update.subscription_status = 'pending'
  } else {
    // Una suscripción vieja o abandonada no cambia el estado actual
    return { clinicId, status: clinic.subscription_status }
  }

  await admin.from('clinics').update(update).eq('id', clinicId)
  return { clinicId, status: (update.subscription_status as string) ?? clinic.subscription_status }
}

/** Cobro mensual de una suscripción (notificación subscription_authorized_payment). */
export async function syncAuthorizedPayment(invoiceId: string) {
  const inv = await invoices().get({ id: invoiceId })
  const paymentStatus = inv.payment?.status ?? inv.status ?? null
  let clinicId = inv.external_reference ?? null

  if (inv.preapproval_id) {
    const result = await syncPreapproval(inv.preapproval_id)
    clinicId = clinicId ?? result.clinicId
  }

  await logEvent({
    clinic_id: clinicId,
    topic: 'subscription_authorized_payment',
    resource_id: invoiceId,
    status: paymentStatus,
    amount: inv.transaction_amount ?? null,
    payload: { status: inv.status, payment: inv.payment, debit_date: inv.debit_date, retry_attempt: inv.retry_attempt },
  })

  // Cobro rechazado de la suscripción vigente → aviso de pago pendiente
  if (clinicId && paymentStatus === 'rejected' && inv.preapproval_id) {
    const admin = createAdminClient()
    await admin
      .from('clinics')
      .update({ subscription_status: 'past_due', subscription_updated_at: new Date().toISOString() })
      .eq('id', clinicId)
      .eq('mp_preapproval_id', inv.preapproval_id)
  }
}

/**
 * Valida la firma `x-signature` que envía Mercado Pago (HMAC-SHA256 con la
 * clave secreta del webhook). Manifiesto: id:{data.id};request-id:{x-request-id};ts:{ts};
 */
export function verifyWebhookSignature(params: { signature: string | null; requestId: string | null; dataId: string | null }) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) return { ok: false, reason: 'missing_secret' as const }
  if (!params.signature) return { ok: false, reason: 'missing_signature' as const }

  const parts = Object.fromEntries(
    params.signature.split(',').map((p) => {
      const [k, ...v] = p.trim().split('=')
      return [k, v.join('=')]
    }),
  )
  if (!parts.ts || !parts.v1) return { ok: false, reason: 'bad_signature' as const }

  const id = params.dataId && /^[a-z0-9]+$/i.test(params.dataId) ? params.dataId.toLowerCase() : params.dataId
  let manifest = ''
  if (id) manifest += `id:${id};`
  if (params.requestId) manifest += `request-id:${params.requestId};`
  manifest += `ts:${parts.ts};`

  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(parts.v1)
  return { ok: a.length === b.length && timingSafeEqual(a, b), reason: 'checked' as const }
}
