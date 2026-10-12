import { formatDate } from '@/lib/format'

type Point = { date: string; kg: number }

/** Curva de peso dibujada en SVG en el servidor (sin librerías de gráficos). */
export function WeightChart({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <p className="py-6 text-sm text-muted">
        {points.length === 1
          ? `Único registro: ${points[0].kg} kg el ${formatDate(points[0].date)}. `
          : 'Todavía no hay pesos registrados. '}
        La curva aparece cuando haya al menos dos consultas con peso.
      </p>
    )
  }

  const W = 640
  const H = 240
  const pad = { l: 48, r: 64, t: 20, b: 32 }
  const times = points.map((p) => new Date(p.date).getTime())
  const t0 = times[0]
  const t1 = times[times.length - 1] === t0 ? t0 + 1 : times[times.length - 1]
  const kgs = points.map((p) => p.kg)
  const spread = Math.max(Math.max(...kgs) - Math.min(...kgs), Math.max(...kgs) * 0.1, 0.5)
  const lo = Math.max(0, Math.min(...kgs) - spread * 0.25)
  const hi = Math.max(...kgs) + spread * 0.25

  const x = (t: number) => pad.l + ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r)
  const y = (kg: number) => pad.t + (1 - (kg - lo) / (hi - lo)) * (H - pad.t - pad.b)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(times[i]).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ')
  const area = `${line} L${x(times[times.length - 1]).toFixed(1)},${H - pad.b} L${x(t0).toFixed(1)},${H - pad.b} Z`
  const ticks = [lo, (lo + hi) / 2, hi]
  const last = points[points.length - 1]
  const first = points[0]
  const diff = last.kg - first.kg

  return (
    <figure className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Curva de peso: de ${first.kg} kg a ${last.kg} kg`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="stroke-line" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[11px]">
              {t.toFixed(1)}
            </text>
          </g>
        ))}
        <path d={area} className="fill-brand-50" />
        <path d={line} className="fill-none stroke-brand-500" strokeWidth={2.5} strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle
            key={`${p.date}-${i}`}
            cx={x(times[i])}
            cy={y(p.kg)}
            r={i === points.length - 1 ? 5 : 3.5}
            className={i === points.length - 1 ? 'fill-brand-500' : 'fill-white stroke-brand-500'}
            strokeWidth={2}
          >
            <title>{`${formatDate(p.date)}: ${p.kg} kg`}</title>
          </circle>
        ))}
        <text x={x(times[times.length - 1]) + 10} y={y(last.kg) + 4} className="fill-fg text-[12px] font-bold">
          {last.kg} kg
        </text>
        <text x={pad.l} y={H - 8} className="fill-muted text-[11px]">
          {formatDate(first.date)}
        </text>
        <text x={W - pad.r} y={H - 8} textAnchor="end" className="fill-muted text-[11px]">
          {formatDate(last.date)}
        </text>
      </svg>
      <figcaption className="text-sm text-muted">
        {diff === 0
          ? 'Peso estable desde el primer registro.'
          : `${diff > 0 ? 'Aumentó' : 'Bajó'} ${Math.abs(diff).toFixed(2).replace(/\.?0+$/, '')} kg (${((diff / first.kg) * 100).toFixed(1)}%) desde el ${formatDate(first.date)}.`}
      </figcaption>
    </figure>
  )
}
