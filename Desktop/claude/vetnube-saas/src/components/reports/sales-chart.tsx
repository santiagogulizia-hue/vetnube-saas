'use client'

import { useMemo, useState } from 'react'
import { type Bucket, compactMoney, niceTicks } from '@/lib/reports'

/**
 * Ventas por período como barras apiladas: costo (abajo) + ganancia (arriba) = venta.
 * Un solo eje (pesos), hover con tooltip y tabla accesible debajo.
 * Colores: slots 1 y 2 de la paleta categórica validada (azul / naranja).
 */
const PROFIT = '#2a78d6'
const COST = '#eb6834'

const W = 760
const H = 260
const PAD = { top: 16, right: 12, bottom: 28, left: 52 }

export function SalesChart({ buckets, currency, unit }: { buckets: Bucket[]; currency: string; unit: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const money = useMemo(() => {
    const f = new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 })
    return (n: number) => f.format(n)
  }, [currency])

  const maxValue = Math.max(...buckets.map((b) => Math.max(b.revenue, b.cost)), 0)
  if (maxValue === 0) {
    return <p className="py-12 text-center text-sm text-muted">No hay ventas en este período.</p>
  }

  const ticks = niceTicks(maxValue)
  const top = ticks[ticks.length - 1]
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const slot = plotW / buckets.length
  const barW = Math.max(Math.min(slot * 0.62, 36), 3)
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH
  const labelEvery = Math.ceil(buckets.length / 12)
  const h = hover !== null ? buckets[hover] : null

  return (
    <figure className="space-y-3">
      {/* Leyenda: siempre presente con 2 series */}
      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm" style={{ background: PROFIT }} aria-hidden />
          Ganancia bruta
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm" style={{ background: COST }} aria-hidden />
          Costo de lo vendido
        </span>
        <span className="text-muted">La altura total de cada barra es la venta del {unit}.</span>
      </figcaption>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Ventas por ${unit}: costo y ganancia`} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#dce7e7" strokeWidth={1} strokeDasharray={t === 0 ? undefined : '3 3'} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#587073">
                {compactMoney(t)}
              </text>
            </g>
          ))}

          {buckets.map((b, i) => {
            const x = PAD.left + i * slot + (slot - barW) / 2
            const costH = Math.min(b.cost, b.revenue > 0 ? b.revenue : b.cost)
            const profitH = Math.max(b.revenue - b.cost, 0)
            const yCost = y(costH)
            const yTop = y(costH + profitH)
            const r = Math.min(4, barW / 2)
            const active = hover === null || hover === i
            return (
              <g key={b.key} opacity={active ? 1 : 0.45}>
                {costH > 0 && (
                  <rect x={x} y={yCost} width={barW} height={Math.max(y(0) - yCost, 0)} fill={COST} rx={profitH > 0 ? 0 : r} />
                )}
                {profitH > 0 && (
                  // 2px de separación con el segmento de costo; esquinas redondeadas solo arriba
                  <path
                    d={`M${x},${yCost - (costH > 0 ? 2 : 0)} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${yCost - (costH > 0 ? 2 : 0)} Z`}
                    fill={PROFIT}
                  />
                )}
                {i % labelEvery === 0 && (
                  <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#587073">
                    {b.label}
                  </text>
                )}
                {/* Área de hover más grande que la barra */}
                <rect
                  x={PAD.left + i * slot}
                  y={PAD.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  tabIndex={0}
                  aria-label={`${b.title}: venta ${money(b.revenue)}, ganancia ${money(b.profit)}`}
                />
              </g>
            )
          })}
        </svg>

        {h && hover !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-10 w-56 rounded-lg border border-line bg-white p-3 text-xs shadow-lg"
            style={{
              left: `clamp(0px, calc(${((PAD.left + (hover + 0.5) * slot) / W) * 100}% - 7rem), calc(100% - 14rem))`,
            }}
          >
            <p className="mb-1.5 font-bold first-letter:uppercase">{h.title}</p>
            <dl className="space-y-1 tabular-nums">
              <Row label="Venta" value={money(h.revenue)} strong />
              <Row label="Costo" value={money(h.cost)} swatch={COST} />
              <Row label="Ganancia" value={money(h.profit)} swatch={PROFIT} />
              <Row label="Margen" value={h.revenue ? `${Math.round((h.profit / h.revenue) * 100)}%` : '—'} />
              <Row label="Operaciones" value={String(h.sales)} />
            </dl>
          </div>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-bold text-brand-600">Ver como tabla</summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-line">
          <table className="w-full text-sm tabular-nums">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-line text-left text-xs tracking-wider text-muted uppercase">
                <th className="px-3 py-2 font-bold first-letter:uppercase">{unit}</th>
                <th className="px-3 py-2 text-right font-bold">Venta</th>
                <th className="px-3 py-2 text-right font-bold">Costo</th>
                <th className="px-3 py-2 text-right font-bold">Ganancia</th>
                <th className="px-3 py-2 text-right font-bold">Operaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {buckets.map((b) => (
                <tr key={b.key}>
                  <td className="px-3 py-1.5 first-letter:uppercase">{b.title}</td>
                  <td className="px-3 py-1.5 text-right">{money(b.revenue)}</td>
                  <td className="px-3 py-1.5 text-right">{money(b.cost)}</td>
                  <td className="px-3 py-1.5 text-right">{money(b.profit)}</td>
                  <td className="px-3 py-1.5 text-right">{b.sales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}

function Row({ label, value, swatch, strong }: { label: string; value: string; swatch?: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? 'font-bold' : ''}`}>
      <dt className="inline-flex items-center gap-1.5 text-muted">
        {swatch && <span className="size-2 rounded-sm" style={{ background: swatch }} aria-hidden />}
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  )
}
