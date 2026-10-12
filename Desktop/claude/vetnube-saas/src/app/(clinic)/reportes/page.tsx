import type { Metadata } from 'next'
import Link from 'next/link'
import { Download, Lock } from 'lucide-react'
import { inputClass, secondaryButton } from '@/components/forms/fields'
import { ActivityTile, BarList, ReportStat } from '@/components/reports/report-widgets'
import { SalesChart } from '@/components/reports/sales-chart'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { requireClinic } from '@/lib/clinic'
import { formatDate, formatMoney, todayIn } from '@/lib/format'
import { formatQty } from '@/lib/inventory'
import { PAYMENT_METHOD, PRODUCT_CATEGORY } from '@/lib/labels'
import { canSeeFinancials } from '@/lib/permissions'
import { PRESETS, type SalesReport, bucketize, percentChange, previousPeriod, resolvePeriod } from '@/lib/reports'

export const metadata: Metadata = { title: 'Reportes' }

type Props = { searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string }> }

export default async function ReportesPage({ searchParams }: Props) {
  const sp = await searchParams
  const { supabase, clinic } = await requireClinic()
  const today = todayIn(clinic.timezone)
  const period = resolvePeriod(sp, today)
  const prev = previousPeriod(period)
  const financial = canSeeFinancials(clinic.role)

  const [{ data, error }, { data: prevData }] = await Promise.all([
    supabase.rpc('sales_report', { p_clinic_id: clinic.id, p_from: period.from, p_to: period.to }),
    supabase.rpc('sales_report', { p_clinic_id: clinic.id, p_from: prev.from, p_to: prev.to }),
  ])
  if (error) {
    throw new Error(
      error.code === 'PGRST202'
        ? 'Falta la función sales_report en la base. Ejecutá la migración 20261012000000_reports_and_team.sql en Supabase.'
        : error.message,
    )
  }
  const r = data as SalesReport
  const p = prevData as SalesReport | null
  const money = (n: number) => formatMoney(Number(n), clinic.currency)

  const revenue = Number(r.revenue)
  const profit = revenue - Number(r.cost)
  const margin = revenue ? (profit / revenue) * 100 : 0
  const avgTicket = r.sales_count ? revenue / r.sales_count : 0
  const prevRevenue = Number(p?.revenue ?? 0)
  const prevProfit = prevRevenue - Number(p?.cost ?? 0)
  const prevTicket = p?.sales_count ? prevRevenue / p.sales_count : 0
  const { unit, buckets } = bucketize(r.daily ?? [])
  const noShowRate = r.appointments ? Math.round((r.no_show / r.appointments) * 100) : 0
  const exportHref = `/reportes/exportar?desde=${period.from}&hasta=${period.to}`

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reportes"
        description={`Del ${formatDate(period.from)} al ${formatDate(period.to)} · comparado con ${formatDate(prev.from)} – ${formatDate(prev.to)}`}
        actions={
          financial && (
            <a href={exportHref} className={secondaryButton}>
              <Download className="size-4" aria-hidden />
              Exportar ventas (CSV)
            </a>
          )
        }
      />

      {/* Filtros de período: una sola fila sobre los gráficos */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => (
          <Link
            key={preset.key}
            href={`/reportes?periodo=${preset.key}`}
            aria-current={period.preset === preset.key ? 'page' : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm font-bold ${
              period.preset === preset.key ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line bg-white text-muted hover:text-fg'
            }`}
          >
            {preset.label}
          </Link>
        ))}
        <form className="ml-auto flex flex-wrap items-center gap-2" aria-label="Rango personalizado">
          <input type="date" name="desde" defaultValue={period.from} max={today} aria-label="Desde" className={`${inputClass} w-auto`} />
          <span className="text-sm text-muted">a</span>
          <input type="date" name="hasta" defaultValue={period.to} max={today} aria-label="Hasta" className={`${inputClass} w-auto`} />
          <button className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold hover:border-brand-500">Aplicar</button>
        </form>
      </div>

      {financial ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReportStat label="Ventas netas" value={money(revenue)} detail={`${r.sales_count} operaciones`} change={percentChange(revenue, prevRevenue)} />
            <ReportStat label="Ganancia bruta" value={money(profit)} detail={`Margen ${margin.toFixed(1).replace('.', ',')}%`} change={percentChange(profit, prevProfit)} />
            <ReportStat label="Ticket promedio" value={money(avgTicket)} change={percentChange(avgTicket, prevTicket)} />
            <ReportStat label="Cobrado" value={money(Number(r.collected))} detail="Incluye pagos de cuenta corriente" change={percentChange(Number(r.collected), Number(p?.collected ?? 0))} />
          </section>

          <Card title={`Ventas y ganancia por ${unit}`}>
            <SalesChart buckets={buckets} currency={clinic.currency} unit={unit} />
          </Card>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Card title="Lo que más vende" action={<span className="text-xs text-muted">Top 10 por facturación</span>}>
              {r.top_products.length === 0 ? (
                <p className="py-4 text-sm text-muted">Sin ventas en este período.</p>
              ) : (
                <div className="-mx-5 overflow-x-auto">
                  <table className="w-full text-sm tabular-nums">
                    <thead>
                      <tr className="border-b border-line text-left text-xs tracking-wider text-muted uppercase">
                        <th className="px-5 py-2 font-bold">Producto / servicio</th>
                        <th className="px-5 py-2 text-right font-bold">Cant.</th>
                        <th className="px-5 py-2 text-right font-bold">Ventas</th>
                        <th className="px-5 py-2 text-right font-bold">Ganancia</th>
                        <th className="px-5 py-2 text-right font-bold">Margen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {r.top_products.map((t, i) => {
                        const tm = Number(t.revenue) ? (Number(t.profit) / Number(t.revenue)) * 100 : 0
                        return (
                          <tr key={`${t.product_id ?? t.name}-${i}`}>
                            <td className="px-5 py-2.5 font-semibold">
                              {t.product_id ? (
                                <Link href={`/inventario/${t.product_id}`} className="hover:text-brand-600">
                                  {t.name}
                                </Link>
                              ) : (
                                <>
                                  {t.name} <span className="text-xs font-normal text-muted">(ítem libre)</span>
                                </>
                              )}
                            </td>
                            <td className="px-5 py-2.5 text-right">{formatQty(t.quantity)}</td>
                            <td className="px-5 py-2.5 text-right font-bold">{money(Number(t.revenue))}</td>
                            <td className="px-5 py-2.5 text-right">{money(Number(t.profit))}</td>
                            <td className={`px-5 py-2.5 text-right ${tm < 0 ? 'font-bold text-rose-700' : ''}`}>{tm.toFixed(0)}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card title="Ventas por categoría">
              <BarList
                rows={r.by_category.map((c) => ({
                  key: c.category,
                  label: PRODUCT_CATEGORY[c.category] ?? c.category,
                  value: Number(c.revenue),
                  display: money(Number(c.revenue)),
                  note: `Ganancia ${money(Number(c.profit))}`,
                }))}
              />
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                <div>
                  <dt className="text-muted">Servicios</dt>
                  <dd className="font-bold tabular-nums">{money(Number(r.services_revenue))}</dd>
                </div>
                <div>
                  <dt className="text-muted">Productos</dt>
                  <dd className="font-bold tabular-nums">{money(Number(r.products_revenue))}</dd>
                </div>
                <div>
                  <dt className="text-muted">Costo de lo vendido</dt>
                  <dd className="font-bold tabular-nums">{money(Number(r.cost))}</dd>
                </div>
                <div>
                  <dt className="text-muted">Descuentos otorgados</dt>
                  <dd className="font-bold tabular-nums">{money(Number(r.discounts))}</dd>
                </div>
              </dl>
            </Card>
          </div>
        </>
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-line bg-white px-5 py-4 text-sm text-muted">
          <Lock className="size-4 shrink-0" aria-hidden />
          Los reportes de ventas, costos y ganancias son solo para el dueño/a y administración. Abajo tenés la actividad clínica.
        </p>
      )}

      <div className={`grid grid-cols-1 gap-5 ${financial ? 'xl:grid-cols-2' : ''}`}>
        {financial && (
          <Card title="Cobros por forma de pago">
            <BarList
              rows={r.by_method.map((m) => ({
                key: m.method,
                label: PAYMENT_METHOD[m.method],
                value: Number(m.amount),
                display: money(Number(m.amount)),
                note: Number(r.collected) ? `${Math.round((Number(m.amount) / Number(r.collected)) * 100)}% de lo cobrado` : undefined,
              }))}
            />
          </Card>
        )}
        <Card title="Actividad clínica">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ActivityTile label="Consultas" value={r.consultations} />
            <ActivityTile label="Turnos atendidos" value={r.attended} note={`de ${r.appointments} agendados`} />
            <ActivityTile label="Ausentismo" value={`${noShowRate}%`} note={`${r.no_show} no vinieron`} />
            <ActivityTile label="Clientes nuevos" value={r.new_clients} />
            <ActivityTile label="Pacientes nuevos" value={r.new_pets} />
            <ActivityTile label="Vacunas y antiparasitarios" value={r.vaccines_applied} />
          </div>
        </Card>
      </div>

      {financial && (
        <p className="text-xs text-muted">
          La ganancia usa el costo de cada producto al momento de venderlo (el último costo de compra registrado). Los servicios sin costo
          cargado cuentan como ganancia completa. Las ventas anuladas no se incluyen.
        </p>
      )}
    </div>
  )
}
