'use client'

import { useActionState, useState } from 'react'
import { Printer } from 'lucide-react'
import { SubmitButton } from '@/components/forms/buttons'
import { Field, FormAlert, errorProps, inputClass, secondaryButton } from '@/components/forms/fields'
import { formDefaults, type FormState } from '@/lib/form-state'
import { PAYMENT_METHOD, options } from '@/lib/labels'
import { useMoney } from './money'

type Action = (state: FormState, fd: FormData) => Promise<FormState>

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={`${secondaryButton} print:hidden`}>
      <Printer className="size-4" aria-hidden />
      Imprimir comprobante
    </button>
  )
}

/** Anulación con motivo obligatorio y confirmación en dos pasos. */
export function VoidSaleForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, null)
  const [open, setOpen] = useState(Boolean(state))
  const f = formDefaults(state)

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-bold text-rose-700 hover:bg-rose-50">
        Anular venta
      </button>
    )
  }
  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="w-full space-y-3" noValidate>
      <FormAlert message={state?.error} />
      <Field label="Motivo de la anulación" htmlFor="reason" required error={f.error('reason')}>
        <input id="reason" name="reason" autoFocus defaultValue={f.value('reason')} placeholder="Ej.: error de carga, devolución del producto" className={inputClass} {...errorProps('reason', f.error('reason'))} />
      </Field>
      <p className="text-xs text-muted">Se devuelve el stock a sus lotes y los pagos quedan reintegrados. No se puede deshacer.</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className={secondaryButton}>
          Volver
        </button>
        <SubmitButton pendingText="Anulando…">Confirmar anulación</SubmitButton>
      </div>
    </form>
  )
}

export function OpenCashForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state)
  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="flex flex-wrap items-end gap-3" noValidate>
      <FormAlert message={state?.error} />
      <Field label="Efectivo inicial en caja" htmlFor="opening_amount" error={f.error('opening_amount')} hint="El cambio con el que arranca el día.">
        <input id="opening_amount" name="opening_amount" inputMode="decimal" defaultValue={f.value('opening_amount')} placeholder="0" className={`${inputClass} w-44`} />
      </Field>
      <div className="mb-5">
        <SubmitButton pendingText="Abriendo…">Abrir caja</SubmitButton>
      </div>
    </form>
  )
}

export function CloseCashForm({ action, expectedCash, currency }: { action: Action; expectedCash: number; currency: string }) {
  const formatMoney = useMoney(currency)
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state)
  const [counted, setCounted] = useState(f.value('counted_cash'))
  const countedNumber = Number(counted.includes(',') ? counted.replace(/\./g, '').replace(',', '.') : counted)
  const diff = counted && Number.isFinite(countedNumber) ? Math.round((countedNumber - expectedCash) * 100) / 100 : null

  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="space-y-3" noValidate>
      <FormAlert message={state?.error} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Efectivo contado" htmlFor="counted_cash" required error={f.error('counted_cash')}>
          <input id="counted_cash" name="counted_cash" inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} className={inputClass} {...errorProps('counted_cash', f.error('counted_cash'))} />
        </Field>
        <div className="flex flex-col justify-center rounded-lg bg-canvas px-3 py-2 text-sm">
          <span className="text-muted">Esperado: {formatMoney(expectedCash)}</span>
          {diff !== null && (
            <span className={`font-bold ${diff === 0 ? 'text-emerald-700' : diff > 0 ? 'text-sky-700' : 'text-rose-700'}`}>
              {diff === 0 ? 'Caja cuadrada' : diff > 0 ? `Sobrante ${formatMoney(diff)}` : `Faltante ${formatMoney(-diff)}`}
            </span>
          )}
        </div>
        <Field label="Observaciones" htmlFor="close_notes" className="sm:col-span-2">
          <input id="close_notes" name="notes" defaultValue={f.value('notes')} placeholder="Retiros, gastos pagados en efectivo, etc." className={inputClass} />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Cerrando…">Cerrar caja</SubmitButton>
      </div>
    </form>
  )
}

/** Cobro de deuda de cuenta corriente (desde la ficha del cliente). */
export function AccountPaymentForm({ action, balance, currency }: { action: Action; balance: number; currency: string }) {
  const formatMoney = useMoney(currency)
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state, { amount: balance, method: 'efectivo' })
  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="space-y-3" noValidate>
      <FormAlert message={state?.error} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Importe" htmlFor="ap_amount" required error={f.error('amount')} hint={`Deuda: ${formatMoney(balance)}`}>
          <input id="ap_amount" name="amount" inputMode="decimal" defaultValue={f.value('amount')} className={inputClass} {...errorProps('ap_amount', f.error('amount'))} />
        </Field>
        <Field label="Forma de pago" htmlFor="ap_method" error={f.error('method')}>
          <select id="ap_method" name="method" defaultValue={f.value('method')} className={inputClass}>
            {options(PAYMENT_METHOD).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nota" htmlFor="ap_notes" className="col-span-2">
          <input id="ap_notes" name="notes" defaultValue={f.value('notes')} className={inputClass} />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Registrando…">Registrar pago</SubmitButton>
      </div>
    </form>
  )
}
