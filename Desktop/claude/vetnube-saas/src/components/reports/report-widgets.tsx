import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

/** Indicador con comparación contra el período anterior (flecha + texto, nunca solo color). */
export function ReportStat({
  label,
  value,
  detail,
  change,
  lowerIsBetter,
}: {
  label: string
  value: string
  detail?: string
  change?: number | null
  lowerIsBetter?: boolean
}) {
  let delta: React.ReactNode = null
  if (change !== undefined) {
    if (change === null) {
      delta = <span className="text-xs text-muted">Sin datos del período anterior</span>
    } else {
      const flat = Math.abs(change) < 0.5
      const good = flat ? null : (change > 0) !== Boolean(lowerIsBetter)
      const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight
      delta = (
        <span className={`inline-flex items-center gap-1 text-xs font-bold ${good === null ? 'text-muted' : good ? 'text-emerald-700' : 'text-rose-700'}`}>
          <Icon className="size-3.5" aria-hidden />
          {flat ? 'Sin cambios' : `${change > 0 ? '+' : ''}${change.toFixed(0)}%`}
          <span className="font-normal text-muted">vs. período anterior</span>
        </span>
      )
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <p className="text-xs font-bold tracking-wider text-muted uppercase">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
      {detail && <p className="mt-0.5 text-sm text-muted">{detail}</p>}
      {delta && <p className="mt-2">{delta}</p>}
    </div>
  )
}

/** Barras horizontales de una sola serie (azul, slot 1), con el valor en texto. */
export function BarList({ rows }: { rows: { key: string; label: string; value: number; display: string; note?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 0)
  if (rows.length === 0 || max <= 0) return <p className="py-4 text-sm text-muted">Sin datos en este período.</p>
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-semibold">{r.label}</span>
            <span className="shrink-0 font-bold tabular-nums">{r.display}</span>
          </div>
          <div className="h-2 rounded-full bg-canvas" aria-hidden>
            <div className="h-2 rounded-full" style={{ width: `${Math.max((r.value / max) * 100, 1.5)}%`, background: '#2a78d6' }} />
          </div>
          {r.note && <p className="text-xs text-muted">{r.note}</p>}
        </li>
      ))}
    </ul>
  )
}

export function ActivityTile({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-lg border border-line p-3">
      <p className="text-xs font-bold tracking-wider text-muted uppercase">{label}</p>
      <p className="mt-1 font-display text-xl font-bold tabular-nums">{value}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  )
}
