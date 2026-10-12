import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, ShoppingCart } from 'lucide-react'
import { primaryButton } from '@/components/forms/fields'
import { PrintButton, VoidSaleForm } from '@/components/pos/sale-forms'
import { ErrorNotice } from '@/components/ui/notice'
import { PageHeader } from '@/components/ui/page-header'
import { Pill } from '@/components/ui/pill'
import { requireClinic } from '@/lib/clinic'
import { formatDateTime, formatMoney, fullName } from '@/lib/format'
import { formatQty, round2 } from '@/lib/inventory'
import { PAYMENT_METHOD } from '@/lib/labels'
import { canDelete } from '@/lib/permissions'
import type { Payment, SaleItem } from '@/lib/types'
import { voidSale } from '../actions'

export const metadata: Metadata = { title: 'Venta' }

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ nueva?: string; error?: string }> }

type SaleDetail = {
  id: string
  number: number
  sold_at: string
  subtotal: number
  discount: number
  total: number
  status: 'completada' | 'anulada'
  notes: string | null
  voided_at: string | null
  void_reason: string | null
  client: { id: string; first_name: string; last_name: string; document_id: string | null } | null
  seller: { full_name: string | null } | null
  sale_items: SaleItem[]
  payments: Payment[]
}

export default async function VentaPage({ params, searchParams }: Props) {
  const [{ id }, { nueva, error }] = await Promise.all([params, searchParams])
  const { supabase, clinic } = await requireClinic()

  const { data } = await supabase
    .from('sales')
    .select(
      'id, number, sold_at, subtotal, discount, total, status, notes, voided_at, void_reason, client:clients(id, first_name, last_name, document_id), seller:profiles!sales_sold_by_fkey(full_name), sale_items(id, product_id, description, quantity, unit_price, discount, line_total), payments(id, method, amount, paid_at, refunded_at)',
    )
    .eq('id', id)
    .eq('clinic_id', clinic.id)
    .maybeSingle()
  if (!data) notFound()
  const sale = data as unknown as SaleDetail

  const money = (n: number) => formatMoney(Number(n), clinic.currency)
  const paid = round2(sale.payments.filter((p) => !p.refunded_at).reduce((s, p) => s + Number(p.amount), 0))
  const pending = sale.status === 'completada' ? round2(Number(sale.total) - paid) : 0

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="print:hidden">
        <PageHeader
          title={`Venta #${sale.number}`}
          back={{ href: '/ventas', label: 'Ventas' }}
          actions={
            <>
              <PrintButton />
              <Link href="/ventas/nueva" className={primaryButton}>
                <ShoppingCart className="size-4" aria-hidden />
                Nueva venta
              </Link>
            </>
          }
        />
      </div>

      {nueva && sale.status === 'completada' && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 print:hidden">
          <CheckCircle2 className="size-4" aria-hidden />
          Venta registrada. El stock ya se descontó.
        </p>
      )}
      <ErrorNotice message={error} />

      {/* Comprobante (también es lo que se imprime) */}
      <article className="rounded-xl border border-line bg-white p-6 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="font-display text-xl font-bold">{clinic.name}</p>
            <p className="text-sm text-muted">Comprobante interno · no válido como factura</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-display text-lg font-bold">#{sale.number}</p>
            <p className="text-muted">{formatDateTime(sale.sold_at, clinic.timezone)}</p>
            {sale.status === 'anulada' && <Pill label="ANULADA" className="mt-1 bg-rose-50 text-rose-700 ring-rose-200" />}
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 py-4 text-sm">
          <div>
            <p className="text-xs font-bold tracking-wider text-muted uppercase">Cliente</p>
            {sale.client ? (
              <Link href={`/clientes/${sale.client.id}`} className="font-semibold hover:text-brand-600">
                {fullName(sale.client)}
                {sale.client.document_id && <span className="text-muted"> · DNI {sale.client.document_id}</span>}
              </Link>
            ) : (
              <p className="font-semibold">Consumidor final</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold tracking-wider text-muted uppercase">Atendió</p>
            <p className="font-semibold">{sale.seller?.full_name ?? '—'}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-line text-left text-xs tracking-wider text-muted uppercase">
              <th className="py-2 font-bold">Detalle</th>
              <th className="py-2 text-right font-bold">Cant.</th>
              <th className="py-2 text-right font-bold">Precio</th>
              <th className="py-2 text-right font-bold">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sale.sale_items.map((i) => (
              <tr key={i.id}>
                <td className="py-2">
                  {i.product_id ? (
                    <Link href={`/inventario/${i.product_id}`} className="hover:text-brand-600 print:no-underline">
                      {i.description}
                    </Link>
                  ) : (
                    i.description
                  )}
                  {Number(i.discount) > 0 && <span className="block text-xs text-muted">Descuento {money(i.discount)}</span>}
                </td>
                <td className="py-2 text-right tabular-nums">{formatQty(i.quantity)}</td>
                <td className="py-2 text-right tabular-nums">{money(i.unit_price)}</td>
                <td className="py-2 text-right font-semibold tabular-nums">{money(i.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{money(sale.subtotal)}</dd>
          </div>
          {Number(sale.discount) > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Descuento</dt>
              <dd className="tabular-nums">−{money(sale.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-1 font-display text-xl font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{money(sale.total)}</dd>
          </div>
          {sale.payments.map((p) => (
            <div key={p.id} className={`flex justify-between ${p.refunded_at ? 'text-muted line-through' : ''}`}>
              <dt>{PAYMENT_METHOD[p.method]}</dt>
              <dd className="tabular-nums">{money(p.amount)}</dd>
            </div>
          ))}
          {pending > 0 && (
            <div className="flex justify-between font-bold text-rose-700">
              <dt>Saldo en cuenta corriente</dt>
              <dd className="tabular-nums">{money(pending)}</dd>
            </div>
          )}
        </dl>

        {sale.notes && <p className="mt-4 text-sm text-muted">Nota: {sale.notes}</p>}
        {sale.status === 'anulada' && (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Anulada el {formatDateTime(sale.voided_at as string, clinic.timezone)}: {sale.void_reason}
          </p>
        )}
      </article>

      {pending > 0 && sale.client && (
        <p className="text-sm print:hidden">
          Para cobrar el saldo, registrá el pago desde la{' '}
          <Link href={`/clientes/${sale.client.id}#cuenta-corriente`} className="font-bold text-brand-600 hover:underline">
            cuenta corriente del cliente
          </Link>
          .
        </p>
      )}

      {sale.status === 'completada' && canDelete(clinic.role) && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-white p-5 print:hidden">
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-bold">Anular venta</h2>
            <p className="text-sm text-muted">Para errores de carga o devoluciones. La venta queda registrada como anulada.</p>
          </div>
          <VoidSaleForm action={voidSale.bind(null, id)} />
        </section>
      )}
    </div>
  )
}
