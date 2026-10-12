import type { Metadata } from 'next'
import { CheckCircle2 } from 'lucide-react'
import { CloseCashForm, OpenCashForm } from '@/components/pos/sale-forms'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { requireClinic } from '@/lib/clinic'
import { formatDateTime, formatMoney } from '@/lib/format'
import { round2 } from '@/lib/inventory'
import { PAYMENT_METHOD } from '@/lib/labels'
import { getOpenCashSession, sessionTotals } from '@/lib/sales'
import type { CashSession } from '@/lib/types'
import { closeCashSession, openCashSession } from '../actions'

export const metadata: Metadata = { title: 'Caja diaria' }

export default async function CajaPage({ searchParams }: { searchParams: Promise<{ cerrada?: string }> }) {
  const { cerrada } = await searchParams
  const { supabase, clinic } = await requireClinic()
  const money = (n: number) => formatMoney(n, clinic.currency)
  const tz = clinic.timezone

  const [session, { data: historyData }] = await Promise.all([
    getOpenCashSession(supabase, clinic.id),
    supabase
      .from('cash_sessions')
      .select('*, opener:profiles!cash_sessions_opened_by_fkey(full_name), closer:profiles!cash_sessions_closed_by_fkey(full_name)')
      .eq('clinic_id', clinic.id)
      .not('closed_at', 'is', null)
      .order('closed_at', { ascending: false })
      .limit(15),
  ])
  const history = (historyData ?? []) as CashSession[]
  const justClosed = cerrada ? history.find((h) => h.id === cerrada) : undefined

  let openPanel: React.ReactNode = null
  if (session) {
    const [{ byMethod, total }, { count }] = await Promise.all([
      sessionTotals(supabase, session.id),
      supabase.from('sales').select('id', { count: 'exact', head: true }).eq('cash_session_id', session.id).eq('status', 'completada'),
    ])
    const expectedCash = round2(Number(session.opening_amount) + (byMethod.get('efectivo') ?? 0))

    openPanel = (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Caja abierta">
          <dl className="space-y-2 text-sm">
            <Row label="Apertura">
              {formatDateTime(session.opened_at, tz)}
              {session.opener?.full_name && ` · ${session.opener.full_name}`}
            </Row>
            <Row label="Ventas registradas">{count ?? 0}</Row>
            <Row label="Efectivo inicial">{money(Number(session.opening_amount))}</Row>
            {[...byMethod].map(([m, v]) => (
              <Row key={m} label={`Cobrado en ${PAYMENT_METHOD[m].toLowerCase()}`}>
                {money(v)}
              </Row>
            ))}
            <Row label="Total cobrado" strong>
              {money(total)}
            </Row>
            <Row label="Efectivo esperado en caja" strong>
              {money(expectedCash)}
            </Row>
          </dl>
        </Card>
        <Card title="Cierre y arqueo">
          <p className="mb-3 text-sm text-muted">
            Contá los billetes y monedas de la caja. El sistema compara con el efectivo esperado (inicial + cobros en efectivo).
          </p>
          <CloseCashForm action={closeCashSession.bind(null, session.id)} expectedCash={expectedCash} currency={clinic.currency} />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Caja diaria" description="Apertura, arqueo y cierre de caja." back={{ href: '/ventas', label: 'Ventas' }} />

      {justClosed && (
        <section className="flex items-start gap-3 rounded-xl bg-emerald-50 p-5 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-bold">Caja cerrada.</p>
            <p>
              Esperado {money(Number(justClosed.expected_cash))} · Contado {money(Number(justClosed.counted_cash))} ·{' '}
              <Difference expected={justClosed.expected_cash} counted={justClosed.counted_cash} money={money} />
            </p>
          </div>
        </section>
      )}

      {session ? (
        openPanel
      ) : (
        <Card title="Abrir caja">
          <p className="mb-4 text-sm text-muted">Hay una sola caja abierta por clínica. Todas las ventas y cobros quedan asociados a ella hasta el cierre.</p>
          <OpenCashForm action={openCashSession} />
        </Card>
      )}

      <Card title="Cierres anteriores">
        {history.length === 0 ? (
          <p className="py-2 text-sm text-muted">Todavía no hay cierres de caja.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs tracking-wider text-muted uppercase">
                  <th className="px-5 py-2 font-bold">Apertura</th>
                  <th className="px-5 py-2 font-bold">Cierre</th>
                  <th className="px-5 py-2 text-right font-bold">Esperado</th>
                  <th className="px-5 py-2 text-right font-bold">Contado</th>
                  <th className="px-5 py-2 text-right font-bold">Diferencia</th>
                  <th className="px-5 py-2 font-bold">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="px-5 py-2.5 whitespace-nowrap tabular-nums">
                      {formatDateTime(h.opened_at, tz)}
                      <span className="block text-xs text-muted">{h.opener?.full_name}</span>
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap tabular-nums">
                      {formatDateTime(h.closed_at as string, tz)}
                      <span className="block text-xs text-muted">{h.closer?.full_name}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{money(Number(h.expected_cash))}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{money(Number(h.counted_cash))}</td>
                    <td className="px-5 py-2.5 text-right">
                      <Difference expected={h.expected_cash} counted={h.counted_cash} money={money} />
                    </td>
                    <td className="px-5 py-2.5 text-muted">{h.notes ?? '—'}</td>
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

function Row({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'border-t border-line pt-2 font-bold' : ''}`}>
      <dt className={strong ? '' : 'text-muted'}>{label}</dt>
      <dd className="text-right tabular-nums">{children}</dd>
    </div>
  )
}

function Difference({ expected, counted, money }: { expected: number | null; counted: number | null; money: (n: number) => string }) {
  const diff = round2(Number(counted ?? 0) - Number(expected ?? 0))
  if (diff === 0) return <span className="font-bold text-emerald-700">Cuadrada</span>
  return (
    <span className={`font-bold tabular-nums ${diff > 0 ? 'text-sky-700' : 'text-rose-700'}`}>
      {diff > 0 ? `Sobrante ${money(diff)}` : `Faltante ${money(-diff)}`}
    </span>
  )
}
