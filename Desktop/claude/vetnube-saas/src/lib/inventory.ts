import { addDays } from '@/lib/format'
import type { Product } from '@/lib/types'

/** 12.000 → "12", 2.5 → "2,5" */
export function formatQty(value: number | null | undefined) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(Number(value ?? 0))
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function stockStatus(p: Pick<Product, 'stock' | 'min_stock' | 'is_service' | 'active'>) {
  if (!p.active) return { label: 'Inactivo', className: 'bg-slate-100 text-slate-600 ring-slate-200' }
  if (p.is_service) return { label: 'Servicio', className: 'bg-brand-50 text-brand-700 ring-brand-200' }
  if (Number(p.stock) <= 0) return { label: 'Sin stock', className: 'bg-rose-50 text-rose-700 ring-rose-200' }
  if (Number(p.stock) <= Number(p.min_stock)) return { label: 'Stock bajo', className: 'bg-amber-50 text-amber-700 ring-amber-200' }
  return { label: 'OK', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
}

/** Estado de un lote según su vencimiento respecto de hoy (fecha de la clínica). */
export function expiryStatus(expiresOn: string | null, today: string) {
  if (!expiresOn) return { label: 'Sin vencimiento', className: 'bg-slate-100 text-slate-600 ring-slate-200', days: null }
  const days = Math.round((Date.parse(expiresOn) - Date.parse(today)) / 86_400_000)
  if (days < 0) return { label: `Vencido hace ${-days} d`, className: 'bg-rose-50 text-rose-700 ring-rose-200', days }
  if (expiresOn <= addDays(today, 30)) return { label: days === 0 ? 'Vence hoy' : `Vence en ${days} d`, className: 'bg-amber-50 text-amber-700 ring-amber-200', days }
  if (expiresOn <= addDays(today, 90)) return { label: `Vence en ${days} d`, className: 'bg-sky-50 text-sky-700 ring-sky-200', days }
  return { label: 'Vigente', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', days }
}
