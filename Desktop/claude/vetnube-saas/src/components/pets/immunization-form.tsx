'use client'

import { useActionState, useRef } from 'react'
import { FormActions } from '@/components/forms/buttons'
import { Field, FormAlert, FormSection, errorProps, inputClass } from '@/components/forms/fields'
import { formDefaults, type FormState } from '@/lib/form-state'
import { IMMUNIZATION_KIND, options } from '@/lib/labels'
import type { StaffMember } from '@/lib/staff'
import type { Species } from '@/lib/types'

const SUGGESTIONS: Record<string, string[]> = {
  canino: ['Séxtuple', 'Óctuple', 'Antirrábica', 'Tos de las perreras', 'Giardia'],
  felino: ['Triple felina', 'Antirrábica', 'Leucemia felina'],
  comun: ['Pipeta antipulgas', 'Comprimido antiparasitario interno', 'Collar antiparasitario'],
}

type Props = {
  action: (state: FormState, fd: FormData) => Promise<FormState>
  initial: Record<string, unknown>
  vets: StaffMember[]
  species: Species
  today: string
  cancelHref: string
  submitLabel: string
}

/** Atajos para completar la próxima dosis (refuerzo de cachorro, trimestral, semestral, anual). */
const QUICK_DUE: { label: string; days?: number; months?: number }[] = [
  { label: '+21 días', days: 21 },
  { label: '+3 meses', months: 3 },
  { label: '+6 meses', months: 6 },
  { label: '+1 año', months: 12 },
]

function shift(day: string, { days, months }: { days: number; months: number }) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + months, d + days)).toISOString().slice(0, 10)
}

export function ImmunizationForm({ action, initial, vets, species, today, cancelHref, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state, initial)
  const appliedRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLInputElement>(null)
  const suggestions = [...(SUGGESTIONS[species] ?? []), ...SUGGESTIONS.comun]

  const setNext = ({ days = 0, months = 0 }: { days?: number; months?: number }) => {
    const applied = appliedRef.current?.value || today
    if (nextRef.current) nextRef.current.value = shift(applied, { days, months })
  }

  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="space-y-5" noValidate>
      <FormAlert message={state?.error} />

      <FormSection title="Aplicación">
        <Field label="Tipo" htmlFor="kind" required error={f.error('kind')}>
          <select id="kind" name="kind" defaultValue={f.value('kind') || 'vacuna'} className={inputClass}>
            {options(IMMUNIZATION_KIND).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Producto / vacuna" htmlFor="name" required error={f.error('name')}>
          <input id="name" name="name" list="immunization-suggestions" defaultValue={f.value('name')} className={inputClass} {...errorProps('name', f.error('name'))} />
          <datalist id="immunization-suggestions">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label="Fecha de aplicación" htmlFor="applied_on" required error={f.error('applied_on')}>
          <input ref={appliedRef} id="applied_on" name="applied_on" type="date" max={today} defaultValue={f.value('applied_on')} className={inputClass} {...errorProps('applied_on', f.error('applied_on'))} />
        </Field>
        <Field label="Lote" htmlFor="batch_number">
          <input id="batch_number" name="batch_number" defaultValue={f.value('batch_number')} className={inputClass} />
        </Field>
        <Field label="Próxima dosis" htmlFor="next_due_on" error={f.error('next_due_on')} hint="Genera el recordatorio en el inicio.">
          <input ref={nextRef} id="next_due_on" name="next_due_on" type="date" defaultValue={f.value('next_due_on')} className={inputClass} {...errorProps('next_due_on', f.error('next_due_on'))} />
          <div className="flex flex-wrap gap-1.5">
            {QUICK_DUE.map(({ label, days, months }) => (
              <button
                key={label}
                type="button"
                onClick={() => setNext({ days, months })}
                className="rounded-full border border-line px-2.5 py-0.5 text-xs font-bold text-muted hover:border-brand-500 hover:text-brand-600"
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Profesional" htmlFor="vet_id">
          <select id="vet_id" name="vet_id" defaultValue={f.value('vet_id')} className={inputClass}>
            <option value="">Sin asignar</option>
            {vets.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Observaciones" htmlFor="notes" className="sm:col-span-2">
          <textarea id="notes" name="notes" rows={2} defaultValue={f.value('notes')} className={inputClass} placeholder="Reacciones, sitio de aplicación, etc." />
        </Field>
      </FormSection>

      <FormActions cancelHref={cancelHref} submitLabel={submitLabel} />
    </form>
  )
}
