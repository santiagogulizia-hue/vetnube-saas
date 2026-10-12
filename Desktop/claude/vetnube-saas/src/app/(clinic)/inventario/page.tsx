import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarClock, Package, PackagePlus, PackageX, Wallet } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { inputClass, primaryButton } from '@/components/forms/fields'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { Pill } from '@/components/ui/pill'
import { SearchBar } from '@/components/ui/search-bar'
import { requireClinic } from '@/lib/clinic'
import { cleanSearch } from '@/lib/form'
import { addDays, formatDate, formatMoney, todayIn } from '@/lib/format'
import { expiryStatus, formatQty, stockStatus } from '@/lib/inventory'
import { PRODUCT_CATEGORY, options } from '@/lib/labels'
import type { Product, ProductCategory } from '@/lib/types'

export const metadata: Metadata = { title: 'Inventario' }

const PAGE_SIZE = 30
const FILTERS = [
  { key: '', label: 'Activos' },
  { key: 'bajo', label: 'Stock bajo' },
  { key: 'servicios', label: 'Servicios' },
  { key: 'inactivos', label: 'Inactivos' },
] as const

type Props = { searchParams: Promise<{ q?: string; categoria?: string; filtro?: string; vista?: string; page?: string }> }
type ExpiringRow = { batch_id: string; product_id: string; product_name: string; batch_number: string | null; expires_on: string; quantity: number }

export default async function InventarioPage({ searchParams }: Props) {
  const sp = await searchParams
  const { supabase, clinic } = await requireClinic()
  const today = todayIn(clinic.timezone)
  const showBatches = sp.vista === 'lotes'

  // Indicadores (sobre todos los productos activos)
  const [{ data: allData }, { data: lowData }, { data: expiringData }] = await Promise.all([
    supabase.from('products').select('stock, cost, is_service').eq('clinic_id', clinic.id).eq('active', true).limit(5000),
    supabase.from('v_low_stock').select('product_id').eq('clinic_id', clinic.id),
    supabase
      .from('v_expiring_batches')
      .select('batch_id, product_id, product_name, batch_number, expires_on, quantity')
      .eq('clinic_id', clinic.id)
      .order('expires_on'),
  ])
  const all = (allData ?? []) as Pick<Product, 'stock' | 'cost' | 'is_service'>[]
  const lowIds = (lowData ?? []).map((r) => r.product_id as string)
  const expiring = (expiringData ?? []) as ExpiringRow[]
  const stockValue = all.filter((p) => !p.is_service).reduce((s, p) => s + Math.max(Number(p.stock), 0) * Number(p.cost), 0)
  const expiringSoon = expiring.filter((b) => b.expires_on <= addDays(today, 30)).length

  const tabs = (
    <nav aria-label="Vista de inventario" className="flex gap-1 border-b border-line">
      {[
        { href: '/inventario', label: 'Productos', on: !showBatches },
        { href: '/inventario?vista=lotes', label: `Lotes por vencer (${expiring.length})`, on: showBatches },
      ].map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.on ? 'page' : undefined}
          className={`border-b-2 px-3 py-2.5 text-sm font-bold ${t.on ? 'border-brand-500 text-brand-700' : 'border-transparent text-muted hover:text-fg'}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )

  const header = (
    <>
      <PageHeader
        title="Inventario"
        description="Stock de medicamentos, alimentos y accesorios, con lotes y vencimientos."
        actions={
          <Link href="/inventario/nuevo" className={primaryButton}>
            <PackagePlus className="size-4" aria-hidden />
            Nuevo producto
          </Link>
        }
      />
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Productos activos" value={all.length} detail={`${all.filter((p) => p.is_service).length} servicios`} icon={Package} />
        <StatCard
          label="Stock bajo"
          value={lowIds.length}
          detail={lowIds.length ? 'Necesitan reposición' : 'Todo sobre el mínimo'}
          icon={PackageX}
          tone={lowIds.length ? 'alert' : 'default'}
          href="/inventario?filtro=bajo"
        />
        <StatCard
          label="Lotes por vencer"
          value={expiringSoon}
          detail="Vencidos o en los próximos 30 días"
          icon={CalendarClock}
          tone={expiringSoon ? 'alert' : 'default'}
          href="/inventario?vista=lotes"
        />
        <StatCard label="Valor del stock" value={formatMoney(stockValue, clinic.currency)} detail="Unidades × costo" icon={Wallet} />
      </section>
      {tabs}
    </>
  )

  if (showBatches) {
    return (
      <div className="space-y-5">
        {header}
        <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          {expiring.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted">No hay lotes vencidos ni por vencer en los próximos 90 días.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs tracking-wider text-muted uppercase">
                    <th className="px-5 py-3 font-bold">Producto</th>
                    <th className="px-5 py-3 font-bold">Lote</th>
                    <th className="px-5 py-3 text-right font-bold">Unidades</th>
                    <th className="px-5 py-3 font-bold">Vencimiento</th>
                    <th className="px-5 py-3 font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {expiring.map((b) => (
                    <tr key={b.batch_id} className="relative hover:bg-canvas/60">
                      <td className="px-5 py-3">
                        <Link href={`/inventario/${b.product_id}`} className="font-bold after:absolute after:inset-0 hover:text-brand-600">
                          {b.product_name}
                        </Link>
                      </td>
                      <td className="px-5 py-3">{b.batch_number ?? '—'}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{formatQty(b.quantity)}</td>
                      <td className="px-5 py-3 tabular-nums">{formatDate(b.expires_on)}</td>
                      <td className="px-5 py-3">
                        <Pill {...expiryStatus(b.expires_on, today)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <p className="text-sm text-muted">
          Al vender se descuenta primero el lote que vence antes (FEFO). Los lotes vencidos no se venden: dalos de baja desde la ficha del
          producto con «Baja por vencimiento».
        </p>
      </div>
    )
  }

  // Listado de productos
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1)
  const term = cleanSearch(sp.q)
  const category = sp.categoria && sp.categoria in PRODUCT_CATEGORY ? (sp.categoria as ProductCategory) : undefined
  const filter = FILTERS.some((f) => f.key === sp.filtro) ? (sp.filtro as string) : ''

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('clinic_id', clinic.id)
    .eq('active', filter !== 'inactivos')
    .order('name')
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  if (term) query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,barcode.ilike.%${term}%`)
  if (category) query = query.eq('category', category)
  if (filter === 'servicios') query = query.eq('is_service', true)
  if (filter === 'bajo') query = query.in('id', lowIds.length ? lowIds : ['00000000-0000-0000-0000-000000000000'])

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  const products = (data ?? []) as Product[]

  return (
    <div className="space-y-5">
      {header}

      <SearchBar placeholder="Buscar por nombre, SKU o código de barras" defaultValue={sp.q}>
        <select name="categoria" defaultValue={category ?? ''} aria-label="Categoría" className={`${inputClass} w-auto`}>
          <option value="">Todas las categorías</option>
          {options(PRODUCT_CATEGORY).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select name="filtro" defaultValue={filter} aria-label="Filtro" className={`${inputClass} w-auto`}>
          {FILTERS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      </SearchBar>

      <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <Package className="size-8 text-ink-400" aria-hidden />
            <p className="font-semibold">{term || category || filter ? 'Ningún producto coincide.' : 'Todavía no hay productos cargados.'}</p>
            {!term && !category && !filter && (
              <Link href="/inventario/nuevo" className="text-sm font-bold text-brand-600 hover:underline">
                Cargar el primer producto
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs tracking-wider text-muted uppercase">
                  <th className="px-5 py-3 font-bold">Producto</th>
                  <th className="px-5 py-3 font-bold">Categoría</th>
                  <th className="px-5 py-3 text-right font-bold">Stock</th>
                  <th className="px-5 py-3 text-right font-bold">Mínimo</th>
                  <th className="px-5 py-3 text-right font-bold">Costo</th>
                  <th className="px-5 py-3 text-right font-bold">Precio</th>
                  <th className="px-5 py-3 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((p) => (
                  <tr key={p.id} className="relative hover:bg-canvas/60">
                    <td className="px-5 py-3">
                      <Link href={`/inventario/${p.id}`} className="font-bold after:absolute after:inset-0 hover:text-brand-600">
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted">
                        {[p.sku, p.tracks_expiry && 'con vencimiento'].filter(Boolean).join(' · ') || p.unit}
                      </p>
                    </td>
                    <td className="px-5 py-3">{PRODUCT_CATEGORY[p.category]}</td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums">{p.is_service ? '—' : formatQty(p.stock)}</td>
                    <td className="px-5 py-3 text-right text-muted tabular-nums">{p.is_service ? '—' : formatQty(p.min_stock)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatMoney(Number(p.cost), clinic.currency)}</td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums">{formatMoney(Number(p.price), clinic.currency)}</td>
                    <td className="px-5 py-3">
                      <Pill {...stockStatus(p)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Pagination
        basePath="/inventario"
        page={page}
        pageSize={PAGE_SIZE}
        total={count ?? 0}
        params={{ q: term || undefined, categoria: category, filtro: filter || undefined }}
      />
    </div>
  )
}

