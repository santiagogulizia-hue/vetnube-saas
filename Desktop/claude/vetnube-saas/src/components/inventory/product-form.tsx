'use client'

import { useActionState, useState } from 'react'
import { FormActions } from '@/components/forms/buttons'
import { Field, FormAlert, FormSection, errorProps, inputClass } from '@/components/forms/fields'
import { formDefaults, type FormState } from '@/lib/form-state'
import { PRODUCT_CATEGORY, options } from '@/lib/labels'
import type { Product } from '@/lib/types'

type Props = {
  action: (state: FormState, fd: FormData) => Promise<FormState>
  product?: Partial<Product>
  isNew?: boolean
  currency: string
  cancelHref: string
  submitLabel: string
}

export function ProductForm({ action, product = {}, isNew, currency, cancelHref, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state, { unit: 'unidad', tax_rate: 21, category: 'medicamento', ...product })
  const [category, setCategory] = useState(f.value('category'))
  const [isService, setIsService] = useState(f.checked('is_service'))
  const [tracksExpiry, setTracksExpiry] = useState(f.checked('tracks_expiry'))
  const [cost, setCost] = useState(f.value('cost'))
  const [price, setPrice] = useState(f.value('price'))
  const service = isService || category === 'servicio'

  const margin = (() => {
    const c = Number(cost.replace(',', '.'))
    const p = Number(price.replace(',', '.'))
    return p > 0 && c > 0 ? Math.round(((p - c) / p) * 100) : null
  })()

  const input = (name: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={name} name={name} defaultValue={f.value(name)} className={inputClass} {...errorProps(name, f.error(name))} {...props} />
  )

  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="space-y-5" noValidate>
      <FormAlert message={state?.error} />

      <FormSection title="Producto">
        <Field label="Nombre" htmlFor="name" required error={f.error('name')} className="sm:col-span-2">
          {input('name', { placeholder: 'Ej.: Pipeta antipulgas perro 10-25 kg' })}
        </Field>
        <Field label="Categoría" htmlFor="category">
          <select id="category" name="category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {options(PRODUCT_CATEGORY).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unidad de venta" htmlFor="unit" hint="unidad, caja, kg, ml, comprimido…">
          {input('unit')}
        </Field>
        <Field label="Código interno (SKU)" htmlFor="sku">
          {input('sku')}
        </Field>
        <Field label="Código de barras" htmlFor="barcode" hint="Para cobrar con lector de código de barras.">
          {input('barcode', { inputMode: 'numeric' })}
        </Field>
        <label htmlFor="is_service" className="flex items-center gap-2.5 text-sm font-semibold sm:col-span-2">
          <input
            id="is_service"
            name="is_service"
            type="checkbox"
            checked={service}
            disabled={category === 'servicio'}
            onChange={(e) => setIsService(e.target.checked)}
            className="size-4 accent-brand-600"
          />
          Es un servicio (consulta, baño, cirugía): no lleva stock
        </label>
      </FormSection>

      <FormSection title="Precios">
        <Field label={`Costo (${currency})`} htmlFor="cost" error={f.error('cost')}>
          <input id="cost" name="cost" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} {...errorProps('cost', f.error('cost'))} />
        </Field>
        <Field
          label={`Precio de venta (${currency})`}
          htmlFor="price"
          required
          error={f.error('price')}
          hint={margin !== null ? `Margen sobre el precio: ${margin}%` : undefined}
        >
          <input id="price" name="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} {...errorProps('price', f.error('price'))} />
        </Field>
        <Field label="IVA (%)" htmlFor="tax_rate" error={f.error('tax_rate')} hint="Informativo, para la futura facturación.">
          {input('tax_rate', { inputMode: 'decimal' })}
        </Field>
      </FormSection>

      {!service && (
        <FormSection title="Stock" description="El stock solo cambia con ingresos, ventas y ajustes, que quedan registrados.">
          <Field label="Stock mínimo" htmlFor="min_stock" error={f.error('min_stock')} hint="Debajo de este número aparece la alerta de reposición.">
            {input('min_stock', { inputMode: 'decimal' })}
          </Field>
          <label htmlFor="tracks_expiry" className="flex items-center gap-2.5 self-end py-2 text-sm font-semibold">
            <input
              id="tracks_expiry"
              name="tracks_expiry"
              type="checkbox"
              checked={tracksExpiry}
              onChange={(e) => setTracksExpiry(e.target.checked)}
              className="size-4 accent-brand-600"
            />
            Maneja lotes con vencimiento (FEFO)
          </label>

          {isNew && (
            <>
              <Field label="Stock inicial" htmlFor="initial_stock" error={f.error('initial_stock')} hint="Opcional. Se registra como primer ingreso.">
                {input('initial_stock', { inputMode: 'decimal' })}
              </Field>
              {tracksExpiry && (
                <>
                  <Field label="Lote inicial" htmlFor="initial_batch">
                    {input('initial_batch')}
                  </Field>
                  <Field label="Vencimiento del lote" htmlFor="initial_expires_on" error={f.error('initial_expires_on')}>
                    {input('initial_expires_on', { type: 'date' })}
                  </Field>
                </>
              )}
            </>
          )}
        </FormSection>
      )}

      <FormSection title="Descripción">
        <Field label="Notas" htmlFor="description" className="sm:col-span-2" hint="Presentación, dosis, proveedor, ubicación en el depósito.">
          <textarea id="description" name="description" rows={2} defaultValue={f.value('description')} className={inputClass} />
        </Field>
      </FormSection>

      <FormActions cancelHref={cancelHref} submitLabel={submitLabel} />
    </form>
  )
}
