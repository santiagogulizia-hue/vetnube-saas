'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireClinic } from '@/lib/clinic'
import { bool, dbErrorMessage, failure, isDate, num, oneOf, text, uuid } from '@/lib/form'
import type { FormState } from '@/lib/form-state'
import { todayIn, withParam } from '@/lib/format'
import { canDelete, canWriteClinical } from '@/lib/permissions'
import type { ProductCategory } from '@/lib/types'

const CATEGORIES: ProductCategory[] = ['medicamento', 'alimento', 'accesorio', 'vacuna', 'antiparasitario', 'higiene', 'servicio', 'otro']

function revalidateInventory(productId?: string) {
  revalidatePath('/inventario')
  if (productId) revalidatePath(`/inventario/${productId}`)
  revalidatePath('/dashboard')
}

function parseProduct(fd: FormData) {
  const category = oneOf(fd, 'category', CATEGORIES) ?? 'otro'
  const isService = bool(fd, 'is_service') || category === 'servicio'
  const data = {
    name: text(fd, 'name'),
    category,
    sku: text(fd, 'sku'),
    barcode: text(fd, 'barcode'),
    unit: text(fd, 'unit') ?? 'unidad',
    description: text(fd, 'description'),
    cost: num(fd, 'cost') ?? 0,
    price: num(fd, 'price'),
    tax_rate: num(fd, 'tax_rate') ?? 21,
    min_stock: isService ? 0 : (num(fd, 'min_stock') ?? 0),
    tracks_expiry: isService ? false : bool(fd, 'tracks_expiry'),
    is_service: isService,
  }

  const errors: Record<string, string> = {}
  if (!data.name) errors.name = 'Ingresá el nombre.'
  if (data.price === null || Number.isNaN(data.price) || data.price < 0) errors.price = 'Ingresá un precio válido.'
  if (Number.isNaN(data.cost) || data.cost < 0) errors.cost = 'Costo inválido.'
  if (Number.isNaN(data.min_stock) || data.min_stock < 0) errors.min_stock = 'Valor inválido.'
  if (Number.isNaN(data.tax_rate) || data.tax_rate < 0 || data.tax_rate > 100) errors.tax_rate = 'Entre 0 y 100.'

  return { data, errors }
}

export async function createProduct(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, clinic } = await requireClinic()
  const { data, errors } = parseProduct(fd)

  // Stock inicial opcional: entra como un ingreso de mercadería (queda en el libro de stock)
  const initialStock = data.is_service ? null : num(fd, 'initial_stock')
  const expiresOn = text(fd, 'initial_expires_on')
  if (initialStock !== null && (Number.isNaN(initialStock) || initialStock < 0)) errors.initial_stock = 'Cantidad inválida.'
  if (initialStock && data.tracks_expiry && !isDate(expiresOn)) errors.initial_expires_on = 'Indicá el vencimiento del lote.'
  if (Object.keys(errors).length) return failure(fd, 'Revisá los campos marcados.', errors)

  const { data: row, error } = await supabase
    .from('products')
    .insert({ ...data, clinic_id: clinic.id })
    .select('id')
    .single()
  if (error) return failure(fd, dbErrorMessage(error))

  if (initialStock) {
    const { error: stockError } = await supabase.rpc('receive_stock', {
      p_product_id: row.id,
      p_quantity: initialStock,
      p_unit_cost: data.cost || null,
      p_batch_number: text(fd, 'initial_batch'),
      p_expires_on: data.tracks_expiry ? expiresOn : null,
      p_notes: 'Stock inicial',
    })
    if (stockError) {
      redirect(withParam(`/inventario/${row.id}`, 'error', `Producto creado, pero no se cargó el stock inicial: ${stockError.message}`))
    }
  }

  revalidateInventory(row.id)
  redirect(`/inventario/${row.id}`)
}

export async function updateProduct(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, clinic } = await requireClinic()
  const { data, errors } = parseProduct(fd)
  if (Object.keys(errors).length) return failure(fd, 'Revisá los campos marcados.', errors)

  const { error } = await supabase.from('products').update(data).eq('id', id).eq('clinic_id', clinic.id)
  if (error) return failure(fd, dbErrorMessage(error))

  revalidateInventory(id)
  redirect(`/inventario/${id}`)
}

/** Los productos con ventas no se borran (las ventas los referencian): se desactivan. */
export async function setProductActive(id: string, active: boolean) {
  const { supabase, clinic } = await requireClinic()
  if (!canDelete(clinic.role)) {
    redirect(withParam(`/inventario/${id}`, 'error', 'Solo el dueño/a o administración pueden activar o desactivar productos.'))
  }
  const { error } = await supabase.from('products').update({ active }).eq('id', id).eq('clinic_id', clinic.id)
  if (error) redirect(withParam(`/inventario/${id}`, 'error', dbErrorMessage(error)))

  revalidateInventory(id)
  redirect(`/inventario/${id}`)
}

/** Ingreso de mercadería: RPC receive_stock (crea el lote si el producto maneja vencimientos). */
export async function receiveStock(productId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, clinic } = await requireClinic()
  const quantity = num(fd, 'quantity')
  const unitCost = num(fd, 'unit_cost')
  const expiresOn = text(fd, 'expires_on')
  const tracksExpiry = fd.get('tracks_expiry') === '1'

  const errors: Record<string, string> = {}
  if (quantity === null || Number.isNaN(quantity) || quantity <= 0) errors.quantity = 'Ingresá una cantidad mayor a cero.'
  if (unitCost !== null && (Number.isNaN(unitCost) || unitCost < 0)) errors.unit_cost = 'Costo inválido.'
  if (tracksExpiry) {
    if (!isDate(expiresOn)) errors.expires_on = 'Indicá la fecha de vencimiento del lote.'
    else if (expiresOn < todayIn(clinic.timezone)) errors.expires_on = 'El lote ya está vencido.'
  }
  if (Object.keys(errors).length) return failure(fd, 'Revisá los campos marcados.', errors)

  const { error } = await supabase.rpc('receive_stock', {
    p_product_id: productId,
    p_quantity: quantity,
    p_unit_cost: unitCost,
    p_batch_number: text(fd, 'batch_number'),
    p_expires_on: tracksExpiry ? expiresOn : null,
    p_notes: text(fd, 'notes'),
  })
  if (error) return failure(fd, dbErrorMessage(error))

  revalidateInventory(productId)
  redirect(withParam(`/inventario/${productId}`, 'ok', `Ingresaron ${quantity} unidades.`))
}

/** Ajuste manual: conteo físico, rotura, uso interno o baja de un lote vencido. */
export async function adjustStock(productId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, clinic } = await requireClinic()
  if (!canWriteClinical(clinic.role)) return failure(fd, 'Tu rol no puede ajustar stock.')

  const amount = num(fd, 'quantity')
  const direction = fd.get('direction') === 'sumar' ? 1 : -1
  const type = oneOf(fd, 'type', ['ajuste', 'uso_interno', 'vencimiento'] as const) ?? 'ajuste'
  const batchId = uuid(fd, 'batch_id')
  const notes = text(fd, 'notes')

  const errors: Record<string, string> = {}
  if (amount === null || Number.isNaN(amount) || amount <= 0) errors.quantity = 'Ingresá una cantidad mayor a cero.'
  if (type !== 'ajuste' && direction === 1) errors.direction = 'El uso interno y las bajas por vencimiento restan stock.'
  if (!notes) errors.notes = 'Indicá el motivo del ajuste.'
  if (Object.keys(errors).length) return failure(fd, 'Revisá los campos marcados.', errors)

  const { error } = await supabase.rpc('adjust_stock', {
    p_product_id: productId,
    p_quantity: direction * (amount as number),
    p_type: type,
    p_batch_id: batchId,
    p_notes: notes,
  })
  if (error) {
    const message = error.code === '23514' ? 'El lote no tiene tantas unidades. Revisá la cantidad.' : dbErrorMessage(error)
    return failure(fd, message)
  }

  revalidateInventory(productId)
  redirect(withParam(`/inventario/${productId}`, 'ok', 'Ajuste registrado.'))
}
