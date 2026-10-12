import { NextResponse } from 'next/server'
import { syncAuthorizedPayment, syncPreapproval, verifyWebhookSignature } from '@/lib/mercadopago'

/**
 * Webhook de Mercado Pago (configurarlo en Tus integraciones → Webhooks,
 * eventos "Planes y suscripciones"). URL: {APP_URL}/api/webhooks/mercadopago
 *
 * No confiamos en el contenido de la notificación: solo tomamos el id y
 * consultamos el recurso real a la API de Mercado Pago con nuestro token.
 */
export async function POST(request: Request) {
  const url = new URL(request.url)
  const body = (await request.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string } }
  const type = body.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic') ?? ''
  const dataId = url.searchParams.get('data.id') ?? body.data?.id ?? null

  const signature = verifyWebhookSignature({
    signature: request.headers.get('x-signature'),
    requestId: request.headers.get('x-request-id'),
    dataId,
  })
  if (signature.reason === 'missing_secret') {
    // Sin clave configurada solo se acepta en desarrollo
    if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Webhook sin configurar' }, { status: 500 })
    console.warn('[mercadopago] MERCADOPAGO_WEBHOOK_SECRET no configurado: se procesa sin validar firma (solo desarrollo).')
  } else if (!signature.ok) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  if (!dataId) return NextResponse.json({ ok: true, ignored: 'sin id' })

  try {
    if (type === 'subscription_preapproval') await syncPreapproval(dataId)
    else if (type === 'subscription_authorized_payment') await syncAuthorizedPayment(dataId)
    // Otros eventos (pagos sueltos, planes) no se usan por ahora
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[mercadopago] error procesando webhook', type, dataId, error)
    // 500 → Mercado Pago reintenta más tarde
    return NextResponse.json({ error: 'No se pudo procesar' }, { status: 500 })
  }
}
