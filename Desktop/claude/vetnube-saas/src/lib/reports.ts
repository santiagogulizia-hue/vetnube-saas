import { isDay, startOfWeek } from '@/lib/agenda'
import { addDays } from '@/lib/format'
import type { PaymentMethod, ProductCategory } from '@/lib/types'

/** Respuesta de la RPC public.sales_report (migración 20261012000000). */
export type SalesReport = {
  from: string
  to: string
  sales_count: number
  revenue: number
  cost: number
  discounts: number
  services_revenue: number
  products_revenue: number
  collected: number
  by_method: { method: PaymentMethod; amount: number }[]
  daily: { day: string; revenue: number; cost: number; sales: number }[]
  top_products: { product_id: string | null; name: string; quantity: number; revenue: number; profit: number }[]
  by_category: { category: ProductCategory; revenue: number; profit: number }[]
  consultations: number
  appointments: number
  attended: number
  no_show: number
  new_clients: number
  new_pets: number
  vaccines_applied: number
}

export const PRESETS = [
  { key: 'hoy', label: 'Hoy' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días' },
  { key: 'mes', label: 'Este mes' },
  { key: 'mes-anterior', label: 'Mes anterior' },
  { key: 'anio', label: 'Este año' },
] as const
export type PresetKey = (typeof PRESETS)[number]['key']

export type Period = { from: string; to: string; preset: PresetKey | 'personalizado' }

const firstOfMonth = (day: string) => `${day.slice(0, 7)}-01`
const lastOfMonth = (day: string) => {
  const [y, m] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}
export const daysIn = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1

/** Período elegido por URL: un atajo (?periodo=) o un rango (?desde=&hasta=). Por defecto, este mes. */
export function resolvePeriod(sp: { periodo?: string; desde?: string; hasta?: string }, today: string): Period {
  if (isDay(sp.desde) && isDay(sp.hasta) && sp.desde <= sp.hasta && daysIn(sp.desde, sp.hasta) <= 732) {
    return { from: sp.desde, to: sp.hasta > today ? today : sp.hasta, preset: 'personalizado' }
  }
  switch (sp.periodo as PresetKey) {
    case 'hoy':
      return { from: today, to: today, preset: 'hoy' }
    case '7d':
      return { from: addDays(today, -6), to: today, preset: '7d' }
    case '30d':
      return { from: addDays(today, -29), to: today, preset: '30d' }
    case 'mes-anterior': {
      const last = addDays(firstOfMonth(today), -1)
      return { from: firstOfMonth(last), to: last, preset: 'mes-anterior' }
    }
    case 'anio':
      return { from: `${today.slice(0, 4)}-01-01`, to: today, preset: 'anio' }
    default:
      return { from: firstOfMonth(today), to: today, preset: 'mes' }
  }
}

/** Período anterior de igual duración (para comparar). "Este mes" se compara con el mismo tramo del mes pasado. */
export function previousPeriod(p: Period): { from: string; to: string } {
  if (p.preset === 'mes' || p.preset === 'mes-anterior') {
    const prevFrom = firstOfMonth(addDays(p.from, -1))
    const length = daysIn(p.from, p.to)
    const prevTo = addDays(prevFrom, length - 1)
    const prevEnd = lastOfMonth(prevFrom)
    return { from: prevFrom, to: prevTo > prevEnd ? prevEnd : prevTo }
  }
  const length = daysIn(p.from, p.to)
  return { from: addDays(p.from, -length), to: addDays(p.from, -1) }
}

export function percentChange(current: number, previous: number) {
  if (!previous) return current ? null : 0
  return ((current - previous) / Math.abs(previous)) * 100
}

export type Bucket = { key: string; label: string; title: string; revenue: number; cost: number; profit: number; sales: number }

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', ...opts })
const asDate = (day: string) => new Date(`${day}T00:00:00Z`)

/** Agrupa la serie diaria por día (≤ 31 días), semana (≤ 120) o mes. */
export function bucketize(daily: SalesReport['daily']) {
  const n = daily.length
  const unit: 'día' | 'semana' | 'mes' = n <= 31 ? 'día' : n <= 120 ? 'semana' : 'mes'
  const map = new Map<string, Bucket>()

  for (const d of daily) {
    const key = unit === 'día' ? d.day : unit === 'semana' ? startOfWeek(d.day) : d.day.slice(0, 7)
    let b = map.get(key)
    if (!b) {
      const date = asDate(unit === 'mes' ? `${key}-01` : key)
      b = {
        key,
        label:
          unit === 'día'
            ? fmt({ day: 'numeric', month: 'numeric' }).format(date)
            : unit === 'semana'
              ? fmt({ day: 'numeric', month: 'short' }).format(date).replace('.', '')
              : fmt({ month: 'short', year: '2-digit' }).format(date).replace('.', ''),
        title:
          unit === 'día'
            ? fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(date)
            : unit === 'semana'
              ? `Semana del ${fmt({ day: 'numeric', month: 'long' }).format(date)}`
              : fmt({ month: 'long', year: 'numeric' }).format(date),
        revenue: 0,
        cost: 0,
        profit: 0,
        sales: 0,
      }
      map.set(key, b)
    }
    b.revenue += Number(d.revenue)
    b.cost += Number(d.cost)
    b.sales += Number(d.sales)
  }
  const buckets = [...map.values()].map((b) => ({ ...b, profit: b.revenue - b.cost }))
  return { unit, buckets }
}

/** Escala "linda" para el eje: 0 → máximo redondeado, con 4 marcas. */
export function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1]
  const raw = max / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step)
}

export function compactMoney(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1e6) return `${(n / 1e6).toFixed(abs >= 1e7 ? 0 : 1).replace('.', ',')} M`
  if (abs >= 1e3) return `${Math.round(n / 1e3)} k`
  return String(Math.round(n))
}
