'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useTransition } from 'react'
import { AlertTriangle, Minus, Plus, ScanBarcode, Search, Trash2, Wallet } from 'lucide-react'
import { submitSale } from '@/app/(clinic)/ventas/actions'
import { FormAlert, inputClass, primaryButton } from '@/components/forms/fields'
import { formatQty, round2 } from '@/lib/inventory'
import { PAYMENT_METHOD, PRODUCT_CATEGORY, options } from '@/lib/labels'
import type { PaymentMethod, ProductCategory } from '@/lib/types'
import { ClientSelect, type ClientOption } from './client-select'

export type PosProduct = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  category: ProductCategory
  price: number
  stock: number
  isService: boolean
  unit: string
}

type CartLine = {
  key: string
  productId: string | null
  description: string
  quantity: number
  unitPrice: number
  discount: number
  stock: number | null // null = servicio o ítem libre
}

/** amount null = "lo que falta": completa automáticamente el resto del total */
type PaymentRow = { key: string; method: PaymentMethod; amount: string | null }

type Props = {
  products: PosProduct[]
  clients: ClientOption[]
  currency: string
  cashOpen: boolean
  initialClientId: string | null
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
/** "1.234,50" → 1234.5 · "1234.5" → 1234.5 · "12,5" → 12.5 */
const toNumber = (s: string) => {
  const clean = s.trim().includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(clean)
  return Number.isFinite(n) ? n : 0
}
let seq = 0
const key = () => `k${++seq}`

export function PosTerminal({ products, clients, currency, cashOpen, initialClientId }: Props) {
  const router = useRouter()
  const searchRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ProductCategory | ''>('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [clientId, setClientId] = useState<string | null>(initialClientId)
  const [globalDiscount, setGlobalDiscount] = useState('')
  const [payments, setPayments] = useState<PaymentRow[]>([{ key: key(), method: 'efectivo', amount: null }])
  const [cashReceived, setCashReceived] = useState('')
  const [notes, setNotes] = useState('')
  const [free, setFree] = useState({ description: '', price: '' })

  const money = useMemo(
    () => (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n || 0),
    [currency],
  )

  // ---------------------------------------------------------------- catálogo
  const results = useMemo(() => {
    const q = normalize(query.trim())
    return products
      .filter((p) => (!category || p.category === category) && (!q || normalize(`${p.name} ${p.sku ?? ''} ${p.barcode ?? ''}`).includes(q)))
      .slice(0, 24)
  }, [products, query, category])

  const addProduct = (p: PosProduct) => {
    setCart((lines) => {
      const existing = lines.find((l) => l.productId === p.id)
      if (existing) return lines.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l))
      return [...lines, { key: key(), productId: p.id, description: p.name, quantity: 1, unitPrice: p.price, discount: 0, stock: p.isService ? null : p.stock }]
    })
    setQuery('')
    setError(undefined)
    searchRef.current?.focus()
  }

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    // Lector de código de barras: tipea el código y manda Enter
    const exact = products.find((p) => p.barcode === q || (p.sku && p.sku.toLowerCase() === q.toLowerCase()))
    const pick = exact ?? (results.length === 1 ? results[0] : undefined)
    if (pick) addProduct(pick)
    else if (results.length === 0) setError(`No hay productos que coincidan con «${q}».`)
  }

  const addFreeItem = () => {
    const price = toNumber(free.price)
    if (!free.description.trim() || !(price >= 0) || free.price === '') return setError('Para un ítem libre escribí la descripción y el precio.')
    setCart((lines) => [...lines, { key: key(), productId: null, description: free.description.trim(), quantity: 1, unitPrice: price, discount: 0, stock: null }])
    setFree({ description: '', price: '' })
    setError(undefined)
  }

  const updateLine = (k: string, patch: Partial<CartLine>) => setCart((lines) => lines.map((l) => (l.key === k ? { ...l, ...patch } : l)))
  const removeLine = (k: string) => setCart((lines) => lines.filter((l) => l.key !== k))

  // ---------------------------------------------------------------- totales
  const subtotal = round2(cart.reduce((s, l) => s + Math.max(l.quantity * l.unitPrice - l.discount, 0), 0))
  const discount = Math.min(Math.max(toNumber(globalDiscount), 0), subtotal)
  const total = round2(subtotal - discount)
  const explicitPaid = payments.reduce((s, p) => s + (p.amount === null ? 0 : toNumber(p.amount)), 0)
  const autoRow = payments.find((p) => p.amount === null)
  const autoAmount = autoRow ? Math.max(round2(total - explicitPaid), 0) : 0
  const amountOf = (p: PaymentRow) => (p.amount === null ? autoAmount : toNumber(p.amount))
  const paid = round2(payments.reduce((s, p) => s + amountOf(p), 0))
  const remaining = round2(total - paid)
  const cashAmount = payments.filter((p) => p.method === 'efectivo').reduce((s, p) => s + amountOf(p), 0)
  const change = cashReceived ? round2(toNumber(cashReceived) - cashAmount) : 0
  const client = clients.find((c) => c.id === clientId)

  const problem =
    cart.length === 0
      ? 'Agregá productos o servicios.'
      : paid > total
        ? 'Los pagos superan el total. Si te pagan de más, usá «Paga con» para calcular el vuelto.'
        : remaining > 0 && !clientId
          ? 'Falta cobrar. Para dejar saldo en cuenta corriente elegí un cliente.'
          : null

  const payAllWith = (method: PaymentMethod) => setPayments([{ key: key(), method, amount: null }])

  const submit = () => {
    if (problem) return setError(problem)
    setError(undefined)
    startTransition(async () => {
      const result = await submitSale({
        clientId,
        items: cart.map((l) => ({
          productId: l.productId,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount,
        })),
        payments: payments.map((p) => ({ method: p.method, amount: amountOf(p) })),
        discount,
        notes: notes || null,
      })
      if ('error' in result) setError(result.error)
      else router.push(`/ventas/${result.id}?nueva=1`)
    })
  }

  // ---------------------------------------------------------------- UI
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
      {/* Catálogo */}
      <section className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            ref={searchRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Buscar producto o escanear código de barras"
            aria-label="Buscar producto"
            className={`${inputClass} py-2.5 pl-9 text-base`}
          />
          <ScanBarcode className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-ink-400" aria-hidden />
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoría">
          {[['', 'Todo'] as const, ...options(PRODUCT_CATEGORY)].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value as ProductCategory | '')}
              aria-pressed={category === value}
              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                category === value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line text-muted hover:text-fg'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {results.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            Sin resultados.{' '}
            <Link href="/inventario/nuevo" className="font-bold text-brand-600 hover:underline">
              Cargar producto
            </Link>
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {results.map((p) => {
              const out = !p.isService && p.stock <= 0
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => addProduct(p)}
                    className="flex h-full w-full flex-col gap-1 rounded-lg border border-line p-3 text-left transition-colors hover:border-brand-500 hover:bg-brand-50/40"
                  >
                    <span className="line-clamp-2 text-sm font-bold">{p.name}</span>
                    <span className="mt-auto flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-brand-700 tabular-nums">{money(p.price)}</span>
                      <span className={out ? 'font-bold text-rose-600' : 'text-muted'}>
                        {p.isService ? 'Servicio' : out ? 'Sin stock' : `${formatQty(p.stock)} ${p.unit}`}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="rounded-lg border border-dashed border-line p-3">
          <p className="mb-2 text-xs font-bold tracking-wider text-muted uppercase">Ítem libre (servicio no cargado)</p>
          <div className="flex flex-wrap gap-2">
            <input
              value={free.description}
              onChange={(e) => setFree((f) => ({ ...f, description: e.target.value }))}
              placeholder="Ej.: Consulta a domicilio"
              aria-label="Descripción del ítem libre"
              className={`${inputClass} min-w-48 flex-1`}
            />
            <input
              value={free.price}
              onChange={(e) => setFree((f) => ({ ...f, price: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFreeItem())}
              inputMode="decimal"
              placeholder="Precio"
              aria-label="Precio del ítem libre"
              className={`${inputClass} w-28`}
            />
            <button type="button" onClick={addFreeItem} className="rounded-lg border border-line px-3 text-sm font-bold hover:border-brand-500">
              Agregar
            </button>
          </div>
        </div>
      </section>

      {/* Ticket */}
      <section className="flex flex-col gap-4 self-start rounded-xl border border-line bg-white p-5 shadow-sm xl:sticky xl:top-20">
        {!cashOpen && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              No hay caja abierta: la venta no va a quedar en ningún arqueo.{' '}
              <Link href="/ventas/caja" className="underline">
                Abrir caja
              </Link>
            </span>
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="pos_client" className="text-sm font-bold text-muted">
            Cliente
          </label>
          <ClientSelect clients={clients} value={clientId} onChange={setClientId} formatMoney={money} />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-bold text-muted">Detalle ({cart.length})</h2>
          {cart.length === 0 ? (
            <p className="rounded-lg bg-canvas py-6 text-center text-sm text-muted">Tocá un producto para agregarlo.</p>
          ) : (
            <ul className="divide-y divide-line">
              {cart.map((l) => {
                const short = l.stock !== null && l.quantity > l.stock
                return (
                  <li key={l.key} className="space-y-2 py-3">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 text-sm font-bold">{l.description}</p>
                      <span className="text-sm font-bold tabular-nums">{money(Math.max(l.quantity * l.unitPrice - l.discount, 0))}</span>
                      <button type="button" onClick={() => removeLine(l.key)} className="text-muted hover:text-rose-600" aria-label={`Quitar ${l.description}`}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center rounded-lg border border-line">
                        <button type="button" className="p-1.5 hover:text-brand-600" aria-label="Restar uno" onClick={() => updateLine(l.key, { quantity: Math.max(1, l.quantity - 1) })}>
                          <Minus className="size-3.5" />
                        </button>
                        <input
                          value={l.quantity}
                          onChange={(e) => updateLine(l.key, { quantity: Math.max(0.001, toNumber(e.target.value) || 1) })}
                          inputMode="decimal"
                          aria-label="Cantidad"
                          className="w-12 border-x border-line py-1 text-center font-bold tabular-nums outline-none"
                        />
                        <button type="button" className="p-1.5 hover:text-brand-600" aria-label="Sumar uno" onClick={() => updateLine(l.key, { quantity: l.quantity + 1 })}>
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <label className="flex items-center gap-1 text-muted">
                        ×
                        <input
                          defaultValue={l.unitPrice}
                          onBlur={(e) => updateLine(l.key, { unitPrice: Math.max(toNumber(e.target.value), 0) })}
                          inputMode="decimal"
                          aria-label="Precio unitario"
                          className="w-20 rounded border border-line px-1.5 py-1 text-right tabular-nums"
                        />
                      </label>
                      <label className="flex items-center gap-1 text-muted">
                        Desc.
                        <input
                          defaultValue={l.discount || ''}
                          onBlur={(e) => updateLine(l.key, { discount: Math.min(Math.max(toNumber(e.target.value), 0), l.quantity * l.unitPrice) })}
                          inputMode="decimal"
                          placeholder="0"
                          aria-label="Descuento de la línea"
                          className="w-16 rounded border border-line px-1.5 py-1 text-right tabular-nums"
                        />
                      </label>
                    </div>
                    {short && (
                      <p className="text-xs font-semibold text-amber-700">
                        Stock disponible: {formatQty(l.stock)}. La venta se registra igual y el stock queda en negativo.
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <dl className="space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{money(subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>
              <label htmlFor="pos_discount" className="text-muted">
                Descuento general
              </label>
            </dt>
            <dd>
              <input
                id="pos_discount"
                value={globalDiscount}
                onChange={(e) => setGlobalDiscount(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="w-28 rounded border border-line px-2 py-1 text-right tabular-nums"
              />
            </dd>
          </div>
          <div className="flex justify-between pt-1 font-display text-2xl font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{money(total)}</dd>
          </div>
        </dl>

        <div className="space-y-2 border-t border-line pt-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-muted">Pagos</h2>
            <button
              type="button"
              onClick={() => setPayments((ps) => [...ps.map((p) => (p.amount === null ? { ...p, amount: String(amountOf(p)) } : p)), { key: key(), method: 'debito', amount: null }])}
              className="text-xs font-bold text-brand-600 hover:underline"
            >
              + Combinar formas de pago
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['efectivo', 'debito', 'credito', 'transferencia', 'mercado_pago'] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => payAllWith(m)}
                className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                  payments.length === 1 && payments[0].method === m ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line text-muted hover:text-fg'
                }`}
              >
                {PAYMENT_METHOD[m]}
              </button>
            ))}
          </div>
          {payments.map((p) => (
            <div key={p.key} className="flex items-center gap-2">
              <select
                value={p.method}
                onChange={(e) => setPayments((ps) => ps.map((x) => (x.key === p.key ? { ...x, method: e.target.value as PaymentMethod } : x)))}
                aria-label="Forma de pago"
                className={`${inputClass} flex-1`}
              >
                {options(PAYMENT_METHOD).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                value={p.amount ?? ''}
                placeholder={p.amount === null ? String(autoAmount) : '0'}
                onChange={(e) => setPayments((ps) => ps.map((x) => (x.key === p.key ? { ...x, amount: e.target.value } : x)))}
                inputMode="decimal"
                aria-label="Importe"
                className={`${inputClass} w-28 text-right tabular-nums`}
              />
              {payments.length > 1 && (
                <button type="button" onClick={() => setPayments((ps) => ps.filter((x) => x.key !== p.key))} className="text-muted hover:text-rose-600" aria-label="Quitar pago">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
          <p className="text-xs text-muted">Un importe vacío completa automáticamente lo que falta. Poné 0 para dejar todo en cuenta corriente.</p>

          {cashAmount > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-canvas px-3 py-2 text-sm">
              <label htmlFor="pos_cash" className="font-semibold">
                Paga con
              </label>
              <input
                id="pos_cash"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                inputMode="decimal"
                placeholder={String(cashAmount)}
                className="w-28 rounded border border-line bg-white px-2 py-1 text-right tabular-nums"
              />
              <span className={`w-28 text-right font-bold tabular-nums ${change < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {cashReceived ? (change < 0 ? `Faltan ${money(-change)}` : `Vuelto ${money(change)}`) : ''}
              </span>
            </div>
          )}

          {remaining > 0 && (
            <p className={`rounded-lg px-3 py-2 text-sm font-semibold ring-1 ${clientId ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}`}>
              {clientId ? `Quedan ${money(remaining)} en la cuenta corriente de ${client?.name}.` : `Faltan ${money(remaining)}. Elegí un cliente para dejarlo en cuenta corriente.`}
            </p>
          )}
        </div>

        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Nota de la venta (opcional)"
          aria-label="Nota de la venta"
          className={inputClass}
        />

        <FormAlert message={error} />

        <button type="button" onClick={submit} disabled={pending || cart.length === 0} className={`${primaryButton} py-3 text-base`}>
          <Wallet className="size-5" aria-hidden />
          {pending ? 'Registrando…' : `Cobrar ${money(total)}`}
        </button>
      </section>
    </div>
  )
}
