import { NextResponse } from 'next/server'
import { isDay } from '@/lib/agenda'
import { requireClinic } from '@/lib/clinic'
import { formatDateTime, fullName, zonedDayRange } from '@/lib/format'
import { PAYMENT_METHOD } from '@/lib/labels'
import { canSeeFinancials } from '@/lib/permissions'
import type { PaymentMethod } from '@/lib/types'

type Row = {
  number: number
  sold_at: string
  status: string
  client: { first_name: string; last_name: string; document_id: string | null } | null
  sale_items: { description: string; quantity: number; unit_price: number; discount: number; line_total: number; unit_cost: number }[]
  payments: { method: PaymentMethod; amount: number; refunded_at: string | null }[]
}

/** CSV para Excel en español: separador ";", coma decimal y BOM UTF-8. */
const num = (n: number) => Number(n ?? 0).toFixed(2).replace('.', ',')
const cell = (v: string | number) => {
  const s = String(v ?? '')
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(request: Request) {
  const { supabase, clinic } = await requireClinic()
  if (!canSeeFinancials(clinic.role)) return new NextResponse('No autorizado', { status: 403 })

  const url = new URL(request.url)
  const from = url.searchParams.get('desde')
  const to = url.searchParams.get('hasta')
  if (!isDay(from) || !isDay(to) || from > to) return new NextResponse('Rango de fechas inválido', { status: 400 })

  const start = zonedDayRange(from, clinic.timezone).start
  const end = zonedDayRange(to, clinic.timezone).end
  const { data, error } = await supabase
    .from('sales')
    .select(
      'number, sold_at, status, client:clients(first_name, last_name, document_id), sale_items(description, quantity, unit_price, discount, line_total, unit_cost), payments(method, amount, refunded_at)',
    )
    .eq('clinic_id', clinic.id)
    .gte('sold_at', start.toISOString())
    .lt('sold_at', end.toISOString())
    .order('sold_at')
    .limit(10000)
  if (error) return new NextResponse(error.message, { status: 500 })

  const header = ['Fecha', 'Venta N.º', 'Estado', 'Cliente', 'DNI/CUIT', 'Detalle', 'Cantidad', 'Precio unitario', 'Descuento', 'Subtotal', 'Costo unitario', 'Ganancia', 'Formas de pago']
  const lines = [header.join(';')]
  for (const s of (data ?? []) as unknown as Row[]) {
    const methods = [...new Set(s.payments.filter((p) => !p.refunded_at).map((p) => PAYMENT_METHOD[p.method]))].join(' + ') || 'Cuenta corriente'
    for (const i of s.sale_items) {
      lines.push(
        [
          formatDateTime(s.sold_at, clinic.timezone),
          s.number,
          s.status,
          fullName(s.client) || 'Consumidor final',
          s.client?.document_id ?? '',
          i.description,
          num(i.quantity),
          num(i.unit_price),
          num(i.discount),
          num(i.line_total),
          num(i.unit_cost),
          num(Number(i.line_total) - Number(i.quantity) * Number(i.unit_cost)),
          methods,
        ]
          .map(cell)
          .join(';'),
      )
    }
  }

  return new NextResponse(`﻿${lines.join('\r\n')}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ventas_${from}_${to}.csv"`,
    },
  })
}
