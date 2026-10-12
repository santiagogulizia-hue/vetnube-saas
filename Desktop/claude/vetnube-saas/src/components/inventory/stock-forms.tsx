'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/components/forms/buttons'
import { Field, FormAlert, errorProps, inputClass } from '@/components/forms/fields'
import { formDefaults, type FormState } from '@/lib/form-state'

type Action = (state: FormState, fd: FormData) => Promise<FormState>

/** Ingreso de mercadería (compra a proveedor). */
export function ReceiveStockForm({ action, tracksExpiry, lastCost, today }: { action: Action; tracksExpiry: boolean; lastCost: number; today: string }) {
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state, { unit_cost: lastCost || '' })

  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="space-y-3" noValidate>
      <input type="hidden" name="tracks_expiry" value={tracksExpiry ? '1' : '0'} />
      <FormAlert message={state?.error} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cantidad" htmlFor="rq_quantity" required error={f.error('quantity')}>
          <input id="rq_quantity" name="quantity" inputMode="decimal" defaultValue={f.value('quantity')} className={inputClass} {...errorProps('rq_quantity', f.error('quantity'))} />
        </Field>
        <Field label="Costo unitario" htmlFor="rq_unit_cost" error={f.error('unit_cost')} hint="Actualiza el costo del producto.">
          <input id="rq_unit_cost" name="unit_cost" inputMode="decimal" defaultValue={f.value('unit_cost')} className={inputClass} />
        </Field>
        {tracksExpiry && (
          <>
            <Field label="Lote" htmlFor="rq_batch">
              <input id="rq_batch" name="batch_number" defaultValue={f.value('batch_number')} className={inputClass} />
            </Field>
            <Field label="Vencimiento" htmlFor="rq_expires" required error={f.error('expires_on')}>
              <input id="rq_expires" name="expires_on" type="date" min={today} defaultValue={f.value('expires_on')} className={inputClass} {...errorProps('rq_expires', f.error('expires_on'))} />
            </Field>
          </>
        )}
        <Field label="Notas" htmlFor="rq_notes" className="col-span-2">
          <input id="rq_notes" name="notes" defaultValue={f.value('notes')} placeholder="Proveedor, número de remito o factura" className={inputClass} />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>Registrar ingreso</SubmitButton>
      </div>
    </form>
  )
}

type Batch = { id: string; label: string }

/** Ajuste manual con motivo obligatorio: conteo, rotura, uso interno o baja de lote vencido. */
export function AdjustStockForm({ action, batches }: { action: Action; batches: Batch[] }) {
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state, { direction: 'restar', type: 'ajuste' })

  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="space-y-3" noValidate>
      <FormAlert message={state?.error} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo" htmlFor="adj_type">
          <select id="adj_type" name="type" defaultValue={f.value('type')} className={inputClass}>
            <option value="ajuste">Ajuste por conteo / rotura</option>
            <option value="uso_interno">Uso interno (consultorio)</option>
            <option value="vencimiento">Baja por vencimiento</option>
          </select>
        </Field>
        <Field label="Operación" htmlFor="adj_direction" error={f.error('direction')}>
          <select id="adj_direction" name="direction" defaultValue={f.value('direction')} className={inputClass}>
            <option value="restar">Restar del stock</option>
            <option value="sumar">Sumar al stock</option>
          </select>
        </Field>
        <Field label="Cantidad" htmlFor="adj_quantity" required error={f.error('quantity')}>
          <input id="adj_quantity" name="quantity" inputMode="decimal" defaultValue={f.value('quantity')} className={inputClass} {...errorProps('adj_quantity', f.error('quantity'))} />
        </Field>
        {batches.length > 0 && (
          <Field label="Lote" htmlFor="adj_batch" hint="Para bajas por vencimiento elegí el lote.">
            <select id="adj_batch" name="batch_id" defaultValue={f.value('batch_id')} className={inputClass}>
              <option value="">Sin lote específico</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Motivo" htmlFor="adj_notes" required error={f.error('notes')} className="col-span-2">
          <input id="adj_notes" name="notes" defaultValue={f.value('notes')} placeholder="Ej.: conteo mensual, frasco roto" className={inputClass} {...errorProps('adj_notes', f.error('notes'))} />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>Registrar ajuste</SubmitButton>
      </div>
    </form>
  )
}
