'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireClinic } from '@/lib/clinic'
import { dbErrorMessage, failure, num, oneOf, text } from '@/lib/form'
import type { FormState } from '@/lib/form-state'
import { round2 } from '@/lib/inventory'
import { canDelete } from '@/lib/permissions'
import type { PaymentMethod } from '@/lib/types'

const METHODS: PaymentMethod[] = ['efectivo', 'debito', 'credito', 'transferencia', 'mercado_pago', 'otro']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function revalidateSales() {
  revalidatePath('/ventas')
  revalidatePath('/ventas/caja')
  revalidatePath('/inventario')
  revalidatePath('/dashboard')
  revalidatePath('/clientes')
}

export type SaleInput = {
  clientId: string | null
  items: { productId: string | null; description: string; quantity: number; unitPrice: number; discount: number }[]
  payments: { method: PaymentMethod; amount: number }[]
  discount: number
  notes: string | null
}

/**
 * La llama el punto de venta (componente de cliente) con el carrito armado.
 * Valida todo de nuevo en el servidor y delega en la RPC create_sale, que en
 * una sola transacción numera la venta, descuenta stock por lote (FEFO) y registra los pagos.
 */
export async function submitSale(input: SaleInput): Promise<{ error: string } | { id: string }> {
  const { supabase, clinic } = await requireClinic()

  if (!input || !Array.isArray(input.items) || input.items.length === 0) return { error: 'Agregá al menos un producto o servicio.' }
  if (input.items.length > 200) return { error: 'Demasiados ítems en una sola venta.' }
  if (input.clientId !== null && !UUID.test(input.clientId)) return { error: 'Cliente inválido.' }

  const items = []
  for (const it of input.items) {
    const quantity = Number(it.quantity)
    const unitPrice = round2(Number(it.unitPrice))
    const discount = round2(Number(it.discount) || 0)
    if (!(quantity > 0)) return { error: `Cantidad inválida en «${it.description}».` }
    if (!(unitPrice >= 0)) return { error: `Precio inválido en «${it.description}».` }
    if (discount < 0 || discount > quantity * unitPrice) return { error: `Descuento inválido en «${it.description}».` }
    if (it.productId) {
      if (!UUID.test(it.productId)) return { error: 'Producto inválido.' }
      items.push({ product_id: it.productId, quantity, unit_price: unitPrice, discount })
    } else {
      const description = String(it.description ?? '').trim().slice(0, 200)
      if (!description) return { error: 'Los ítems libres necesitan una descripción.' }
      items.push({ description, quantity, unit_price: unitPrice, discount })
    }
  }

  const payments = []
  for (const p of input.payments ?? []) {
    const amount = round2(Number(p.amount))
    if (!METHODS.includes(p.method)) return { error: 'Forma de pago inválida.' }
    if (amount > 0) payments.push({ method: p.method, amount })
  }

  const { data, error } = await supabase.rpc('create_sale', {
    p_clinic_id: clinic.id,
    p_client_id: input.clientId,
    p_items: items,
    p_payments: payments,
    p_discount: round2(Math.max(Number(input.discount) || 0, 0)),
    p_notes: input.notes?.trim().slice(0, 500) || null,
  })
  if (error) return { error: dbErrorMessage(error) }

  revalidateSales()
  return { id: data as string }
}

export async function voidSale(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, clinic } = await requireClinic()
  if (!canDelete(clinic.role)) return failure(fd, 'Solo el dueño/a o administración pueden anular ventas.')
  const reason = text(fd, 'reason')
  if (!reason) return failure(fd, 'Indicá el motivo de la anulación.', { reason: 'Obligatorio.' })

  const { error } = await supabase.rpc('void_sale', { p_sale_id: id, p_reason: reason })
  if (error) return failure(fd, dbErrorMessage(error))

  revalidateSales()
  redirect(`/ventas/${id}`)
}

/** Pago a cuenta corriente (cancela deuda de ventas anteriores). */
export async function registerAccountPayment(clientId: string, returnTo: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireClinic()
  const amount = num(fd, 'amount')
  const method = oneOf(fd, 'method', METHODS)
  const errors: Record<string, string> = {}
  if (amount === null || Number.isNaN(amount) || amount <= 0) errors.amount = 'Ingresá el importe.'
  if (!method) errors.method = 'Elegí la forma de pago.'
  if (Object.keys(errors).length) return failure(fd, 'Revisá los campos marcados.', errors)

  const { error } = await supabase.rpc('register_account_payment', {
    p_client_id: clientId,
    p_method: method,
    p_amount: round2(amount as number),
    p_notes: text(fd, 'notes'),
  })
  if (error) return failure(fd, dbErrorMessage(error))

  revalidateSales()
  revalidatePath(`/clientes/${clientId}`)
  redirect(returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : `/clientes/${clientId}`)
}

// ---------------------------------------------------------------------------
// Caja diaria
// ---------------------------------------------------------------------------

export async function openCashSession(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, clinic } = await requireClinic()
  const opening = num(fd, 'opening_amount') ?? 0
  if (Number.isNaN(opening) || opening < 0) return failure(fd, undefined, { opening_amount: 'Importe inválido.' })

  const { error } = await supabase.rpc('open_cash_session', { p_clinic_id: clinic.id, p_opening_amount: round2(opening) })
  if (error) return failure(fd, dbErrorMessage(error))

  revalidateSales()
  redirect('/ventas/caja')
}

export async function closeCashSession(sessionId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireClinic()
  const counted = num(fd, 'counted_cash')
  if (counted === null || Number.isNaN(counted) || counted < 0) {
    return failure(fd, 'Contá el efectivo de la caja e ingresá el total.', { counted_cash: 'Obligatorio.' })
  }

  const { error } = await supabase.rpc('close_cash_session', {
    p_session_id: sessionId,
    p_counted_cash: round2(counted),
    p_notes: text(fd, 'notes'),
  })
  if (error) return failure(fd, dbErrorMessage(error))

  revalidateSales()
  redirect(`/ventas/caja?cerrada=${sessionId}`)
}
