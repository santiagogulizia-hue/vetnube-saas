import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { ConfirmSubmit } from '@/components/forms/buttons'
import { secondaryButton } from '@/components/forms/fields'
import { AdjustStockForm, ReceiveStockForm } from '@/components/inventory/stock-forms'
import { Card } from '@/components/ui/card'
import { ErrorNotice } from '@/components/ui/notice'
import { PageHeader } from '@/components/ui/page-header'
import { Pill } from '@/components/ui/pill'
import { requireClinic } from '@/lib/clinic'
import { formatDate, formatDateTime, formatMoney, todayIn } from '@/lib/format'
import { expiryStatus, formatQty, stockStatus } from '@/lib/inventory'
import { PRODUCT_CATEGORY, STOCK_MOVEMENT } from '@/lib/labels'
import { canDelete, canWriteClinical } from '@/lib/permissions'
import type { Product, ProductBatch, StockMovementType } from '@/lib/types'
import { adjustStock, receiveStock, setProductActive } from '../actions'

export const metadata: Metadata = { title: 'Producto' }

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }
type Movement = {
  id: number
  type: StockMovementType
  quantity: number
  unit_cost: number | null
  notes: string | null
  created_at: string
  batch: { batch_number: string | null } | null
  sale: { id: string; number: number } | null
  user: { full_name: string | null } | null
}

export default async function ProductoPage({ params, searchParams }: Props) {
  const [{ id }, { error, ok }] = await Promise.all([params, searchParams])
  const { supabase, clinic } = await requireClinic()
  const today = todayIn(clinic.timezone)

  const { data } = await supabase.from('products').select('*').eq('id', id).eq('clinic_id', clinic.id).maybeSingle()
  if (!data) notFound()
  const p = data as Product

  const [{ data: batchesData }, { data: movementsData }] = await Promise.all([
    supabase.from('product_batches').select('*').eq('product_id', id).gt('quantity', 0).order('expires_on', { nullsFirst: false }),
    supabase
      .from('stock_movements')
      .select('id, type, quantity, unit_cost, notes, created_at, batch:product_batches(batch_number), sale:sales(id, number), user:profiles(full_name)')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])
  const batches = (batchesData ?? []) as ProductBatch[]
  const movements = (movementsData ?? []) as unknown as Movement[]
  const price = Number(p.price)
  const cost = Number(p.cost)
  const margin = price > 0 && cost > 0 ? Math.round(((price - cost) / price) * 100) : null

  return (
    <div className="space-y-5">
      <PageHeader
        title={p.name}
        description={[PRODUCT_CATEGORY[p.category], p.sku && `SKU ${p.sku}`, p.barcode && `Código ${p.barcode}`].filter(Boolean).join(' · ')}
        back={{ href: '/inventario', label: 'Inventario' }}
        actions={
          <Link href={`/inventario/${id}/editar`} className={secondaryButton}>
            <Pencil className="size-4" aria-hidden />
            Editar
          </Link>
        }
      />

      <ErrorNotice message={error} />
      {ok && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
          {ok}
        </p>
      )}

      <section className="grid grid-cols-2 gap-4 rounded-xl border border-line bg-white p-5 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
        <Fact label="Estado">
          <Pill {...stockStatus(p)} />
        </Fact>
        <Fact label="Stock">{p.is_service ? '—' : `${formatQty(p.stock)} ${p.unit}`}</Fact>
        <Fact label="Mínimo">{p.is_service ? '—' : formatQty(p.min_stock)}</Fact>
        <Fact label="Costo">{formatMoney(cost, clinic.currency)}</Fact>
        <Fact label="Precio">{formatMoney(price, clinic.currency)}</Fact>
        <Fact label="Margen">{margin === null ? '—' : `${margin}%`}</Fact>
        {p.description && <p className="col-span-full text-sm whitespace-pre-line text-muted">{p.description}</p>}
      </section>

      {!p.is_service && p.active && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card title="Ingreso de mercadería">
            <ReceiveStockForm action={receiveStock.bind(null, id)} tracksExpiry={p.tracks_expiry} lastCost={cost} today={today} />
          </Card>
          {canWriteClinical(clinic.role) && (
            <Card title="Ajuste de stock">
              <AdjustStockForm
                action={adjustStock.bind(null, id)}
                batches={batches.map((b) => ({
                  id: b.id,
                  label: `${b.batch_number ?? 'Sin número'} · vence ${formatDate(b.expires_on)} · ${formatQty(b.quantity)} u.`,
                }))}
              />
            </Card>
          )}
        </div>
      )}

      {p.tracks_expiry && (
        <Card title="Lotes en stock" action={<span className="text-xs text-muted">Se venden primero los que vencen antes (FEFO)</span>}>
          {batches.length === 0 ? (
            <p className="py-2 text-sm text-muted">No hay lotes con unidades disponibles.</p>
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs tracking-wider text-muted uppercase">
                    <th className="px-5 py-2 font-bold">Orden</th>
                    <th className="px-5 py-2 font-bold">Lote</th>
                    <th className="px-5 py-2 font-bold">Vencimiento</th>
                    <th className="px-5 py-2 text-right font-bold">Unidades</th>
                    <th className="px-5 py-2 font-bold">Ingresó</th>
                    <th className="px-5 py-2 font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {batches.map((b, i) => {
                    const status = expiryStatus(b.expires_on, today)
                    return (
                      <tr key={b.id}>
                        <td className="px-5 py-2.5 text-muted tabular-nums">{status.days !== null && status.days < 0 ? '—' : `${i + 1}º`}</td>
                        <td className="px-5 py-2.5 font-semibold">{b.batch_number ?? '—'}</td>
                        <td className="px-5 py-2.5 tabular-nums">{formatDate(b.expires_on)}</td>
                        <td className="px-5 py-2.5 text-right font-bold tabular-nums">{formatQty(b.quantity)}</td>
                        <td className="px-5 py-2.5 text-muted tabular-nums">{formatDate(b.received_at)}</td>
                        <td className="px-5 py-2.5">
                          <Pill {...status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {!p.is_service && (
        <Card title="Movimientos de stock" action={<span className="text-xs text-muted">Últimos 50</span>}>
          {movements.length === 0 ? (
            <p className="py-2 text-sm text-muted">Sin movimientos todavía.</p>
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs tracking-wider text-muted uppercase">
                    <th className="px-5 py-2 font-bold">Fecha</th>
                    <th className="px-5 py-2 font-bold">Movimiento</th>
                    <th className="px-5 py-2 text-right font-bold">Cantidad</th>
                    <th className="px-5 py-2 font-bold">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className="px-5 py-2.5 whitespace-nowrap text-muted tabular-nums">{formatDateTime(m.created_at, clinic.timezone)}</td>
                      <td className="px-5 py-2.5 font-semibold">{STOCK_MOVEMENT[m.type]}</td>
                      <td className={`px-5 py-2.5 text-right font-bold tabular-nums ${m.quantity > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {m.quantity > 0 ? '+' : ''}
                        {formatQty(m.quantity)}
                      </td>
                      <td className="px-5 py-2.5 text-muted">
                        {[
                          m.batch?.batch_number && `Lote ${m.batch.batch_number}`,
                          m.unit_cost != null && `Costo ${formatMoney(Number(m.unit_cost), clinic.currency)}`,
                          m.notes,
                          m.user?.full_name,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        {m.sale && (
                          <Link href={`/ventas/${m.sale.id}`} className="ml-1 font-bold text-brand-600 hover:underline">
                            Venta #{m.sale.number}
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {canDelete(clinic.role) && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-5">
          <div>
            <h2 className="font-display font-bold">{p.active ? 'Desactivar producto' : 'Producto inactivo'}</h2>
            <p className="text-sm text-muted">
              {p.active
                ? 'Deja de aparecer en el punto de venta. Su historial de ventas y movimientos se conserva.'
                : 'No aparece en el punto de venta. Podés reactivarlo cuando quieras.'}
            </p>
          </div>
          <form action={setProductActive.bind(null, id, !p.active)}>
            <ConfirmSubmit label={p.active ? 'Desactivar' : 'Reactivar'} confirmLabel={p.active ? 'Sí, desactivar' : 'Sí, reactivar'} />
          </form>
        </section>
      )}
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold tracking-wider text-muted uppercase">{label}</p>
      <div className="mt-1 font-semibold tabular-nums">{children}</div>
    </div>
  )
}
