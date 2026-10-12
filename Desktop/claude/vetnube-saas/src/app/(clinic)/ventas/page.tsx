import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, HandCoins, Landmark, Receipt, ShoppingCart, Wallet } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { inputClass, primaryButton, secondaryButton } from '@/components/forms/fields'
import { PageHeader } from '@/components/ui/page-header'
import { Pill } from '@/components/ui/pill'
import { isDay } from '@/lib/agenda'
import { requireClinic } from '@/lib/clinic'
import { addDays, formatLongDate, formatMoney, formatTime, fullName, todayIn, zonedDayRange } from '@/lib/format'
import { round2 } from '@/lib/inventory'
import { PAYMENT_METHOD } from '@/lib/labels'
import { getOpenCashSession } from '@/lib/sales'
import type { PaymentMethod } from '@/lib/types'

export const metadata: Metadata = { title: 'Ventas' }

type SaleRow = {
  id: string
  number: number
  sold_at: string
  total: number
  status: 'completada' | 'anulada'
  client: { id: string; first_name: string; last_name: string } | null
  sale_items: { description: string; quantity: number }[]
  payments: { method: PaymentMethod; amount: number; refunded_at: string | null }[]
}

export default async function VentasPage({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  const { fecha } = await searchParams
  const { supabase, clinic } = await requireClinic()
  const today = todayIn(clinic.timezone)
  const day = isDay(fecha) ? fecha : today
  const { start, end } = zonedDayRange(day, clinic.timezone)

  const [{ data: salesData, error }, { data: paymentsData }, session] = await Promise.all([
    supabase
      .from('sales')
      .select('id, number, sold_at, total, status, client:clients(id, first_name, last_name), sale_items(description, quantity), payments(method, amount, refunded_at)')
      .eq('clinic_id', clinic.id)
      .gte('sold_at', start.toISOString())
      .lt('sold_at', end.toISOString())
      .order('sold_at', { ascending: false }),
    supabase
      .from('payments')
      .select('method, amount')
      .eq('clinic_id', clinic.id)
      .is('refunded_at', null)
      .gte('paid_at', start.toISOString())
      .lt('paid_at', end.toISOString()),
    getOpenCashSession(supabase, clinic.id),
  ])
  if (error) throw new Error(error.message)

  const sales = (salesData ?? []) as unknown as SaleRow[]
  const completed = sales.filter((s) => s.status === 'completada')
  const sold = completed.reduce((s, v) => s + Number(v.total), 0)
  const paidOf = (s: SaleRow) => s.payments.filter((p) => !p.refunded_at).reduce((t, p) => t + Number(p.amount), 0)
  const onAccount = round2(completed.reduce((t, s) => t + Math.max(Number(s.total) - paidOf(s), 0), 0))

  const byMethod = new Map<PaymentMethod, number>()
  for (const p of (paymentsData ?? []) as { method: PaymentMethod; amount: number }[]) {
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + Number(p.amount))
  }
  const collected = [...byMethod.values()].reduce((s, v) => s + v, 0)
  const money = (n: number) => formatMoney(n, clinic.currency)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ventas y caja"
        description="Ventas del día, cobros por forma de pago y estado de la caja."
        actions={
          <>
            <Link href="/ventas/caja" className={secondaryButton}>
              <Landmark className="size-4" aria-hidden />
              Caja
            </Link>
            <Link href="/ventas/nueva" className={primaryButton}>
              <ShoppingCart className="size-4" aria-hidden />
              Nueva venta
            </Link>
          </>
        }
      />

      <section
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-3 text-sm ring-1 ${
          session ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'
        }`}
      >
        <span className="font-semibold">
          {session
            ? `Caja abierta desde ${formatTime(session.opened_at, clinic.timezone)}${session.opener?.full_name ? ` por ${session.opener.full_name}` : ''}.`
            : 'La caja está cerrada. Abrila para que las ventas del día queden en el arqueo.'}
        </span>
        <Link href="/ventas/caja" className="font-bold underline">
          {session ? 'Ver arqueo y cerrar' : 'Abrir caja'}
        </Link>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/ventas?fecha=${addDays(day, -1)}`} className="grid size-9 place-items-center rounded-lg border border-line bg-white hover:border-brand-500" aria-label="Día anterior">
          <ChevronLeft className="size-4" />
        </Link>
        <Link href="/ventas" className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold hover:border-brand-500">
          Hoy
        </Link>
        <Link href={`/ventas?fecha=${addDays(day, 1)}`} className="grid size-9 place-items-center rounded-lg border border-line bg-white hover:border-brand-500" aria-label="Día siguiente">
          <ChevronRight className="size-4" />
        </Link>
        <h2 className="mx-2 font-display text-xl font-bold">{formatLongDate(day)}</h2>
        <form className="ml-auto flex gap-2">
          <input type="date" name="fecha" defaultValue={day} aria-label="Elegir fecha" className={`${inputClass} w-auto`} />
          <button className="rounded-lg border border-line bg-white px-3 text-sm font-bold hover:border-brand-500">Ver</button>
        </form>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Vendido" value={money(sold)} detail={`${completed.length} ${completed.length === 1 ? 'venta' : 'ventas'}`} icon={Receipt} />
        <StatCard label="Cobrado" value={money(collected)} detail="Incluye pagos de cuenta corriente" icon={Wallet} />
        <StatCard label="Quedó en cuenta corriente" value={money(onAccount)} detail="Saldo de las ventas del día" icon={HandCoins} tone={onAccount > 0 ? 'alert' : 'default'} />
        <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
          <p className="text-xs font-bold tracking-wider text-muted uppercase">Por forma de pago</p>
          {byMethod.size === 0 ? (
            <p className="mt-3 text-sm text-muted">Sin cobros.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {[...byMethod].map(([m, v]) => (
                <li key={m} className="flex justify-between gap-2">
                  <span className="text-muted">{PAYMENT_METHOD[m]}</span>
                  <span className="font-bold tabular-nums">{money(v)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        {sales.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <Receipt className="size-8 text-ink-400" aria-hidden />
            <p className="font-semibold">No hay ventas este día.</p>
            {day === today && (
              <Link href="/ventas/nueva" className="text-sm font-bold text-brand-600 hover:underline">
                Registrar una venta
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs tracking-wider text-muted uppercase">
                  <th className="px-5 py-3 font-bold">N.º</th>
                  <th className="px-5 py-3 font-bold">Hora</th>
                  <th className="px-5 py-3 font-bold">Cliente</th>
                  <th className="px-5 py-3 font-bold">Detalle</th>
                  <th className="px-5 py-3 font-bold">Pago</th>
                  <th className="px-5 py-3 text-right font-bold">Total</th>
                  <th className="px-5 py-3 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sales.map((s) => {
                  const paid = paidOf(s)
                  const status =
                    s.status === 'anulada'
                      ? { label: 'Anulada', className: 'bg-slate-100 text-slate-600 ring-slate-200' }
                      : paid + 0.005 >= Number(s.total)
                        ? { label: 'Pagada', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
                        : { label: `Debe ${money(Number(s.total) - paid)}`, className: 'bg-rose-50 text-rose-700 ring-rose-200' }
                  const methods = [...new Set(s.payments.map((p) => PAYMENT_METHOD[p.method]))].join(' + ')
                  return (
                    <tr key={s.id} className={`relative hover:bg-canvas/60 ${s.status === 'anulada' ? 'opacity-60' : ''}`}>
                      <td className="px-5 py-3 font-bold tabular-nums">
                        <Link href={`/ventas/${s.id}`} className="after:absolute after:inset-0 hover:text-brand-600">
                          #{s.number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 tabular-nums">{formatTime(s.sold_at, clinic.timezone)}</td>
                      <td className="px-5 py-3">{fullName(s.client) || <span className="text-muted">Consumidor final</span>}</td>
                      <td className="max-w-72 truncate px-5 py-3 text-muted">
                        {s.sale_items.map((i) => (i.quantity > 1 ? `${i.quantity}× ${i.description}` : i.description)).join(', ')}
                      </td>
                      <td className="px-5 py-3">{methods || <span className="text-muted">Cuenta corriente</span>}</td>
                      <td className="px-5 py-3 text-right font-bold tabular-nums">{money(Number(s.total))}</td>
                      <td className="px-5 py-3">
                        <Pill {...status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
