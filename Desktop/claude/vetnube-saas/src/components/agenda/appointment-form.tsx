'use client'

import { useActionState } from 'react'
import { FormActions } from '@/components/forms/buttons'
import { Field, FormAlert, FormSection, errorProps, inputClass } from '@/components/forms/fields'
import { DURATIONS } from '@/lib/agenda'
import { formDefaults, type FormState } from '@/lib/form-state'
import { APPOINTMENT_STATUS, APPOINTMENT_TYPE, options } from '@/lib/labels'
import type { StaffMember } from '@/lib/staff'
import { PetPicker, type PetOption } from './pet-picker'

type Props = {
  action: (state: FormState, fd: FormData) => Promise<FormState>
  initial: Record<string, unknown>
  pets: PetOption[]
  vets: StaffMember[]
  showStatus?: boolean
  returnTo: string
  cancelHref: string
  submitLabel: string
}

const durationLabel = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`)

export function AppointmentForm({ action, initial, pets, vets, showStatus, returnTo, cancelHref, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state, initial)

  const select = (name: string, items: readonly (readonly [string, string])[], emptyLabel?: string) => (
    <select id={name} name={name} defaultValue={f.value(name)} className={inputClass} {...errorProps(name, f.error(name))}>
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {items.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  )

  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="return_to" value={returnTo} />
      <FormAlert message={state?.error} />

      <FormSection title="Paciente y motivo">
        <Field label="Paciente" htmlFor="pet_search" required error={f.error('pet_id')} className="sm:col-span-2">
          <PetPicker pets={pets} defaultId={f.value('pet_id')} error={f.error('pet_id')} />
        </Field>
        <Field label="Tipo de turno" htmlFor="type">
          {select('type', options(APPOINTMENT_TYPE))}
        </Field>
        <Field label="Motivo" htmlFor="reason">
          <input id="reason" name="reason" defaultValue={f.value('reason')} className={inputClass} placeholder="Ej.: control post quirúrgico" />
        </Field>
      </FormSection>

      <FormSection title="Fecha y profesional">
        <Field label="Fecha" htmlFor="date" required error={f.error('date')}>
          <input id="date" name="date" type="date" defaultValue={f.value('date')} className={inputClass} {...errorProps('date', f.error('date'))} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Hora" htmlFor="time" required error={f.error('time')}>
            <input id="time" name="time" type="time" step={300} defaultValue={f.value('time')} className={inputClass} {...errorProps('time', f.error('time'))} />
          </Field>
          <Field label="Duración" htmlFor="duration" error={f.error('duration')}>
            {select('duration', DURATIONS.map((m) => [String(m), durationLabel(m)] as const))}
          </Field>
        </div>
        <Field label="Profesional" htmlFor="vet_id" hint="Si lo asignás, la agenda no permite superponerle turnos.">
          {select('vet_id', vets.map((v) => [v.id, v.name] as const), 'Sin asignar')}
        </Field>
        {showStatus && <Field label="Estado" htmlFor="status">{select('status', options(APPOINTMENT_STATUS))}</Field>}
        <Field label="Notas internas" htmlFor="notes" className="sm:col-span-2">
          <textarea id="notes" name="notes" rows={2} defaultValue={f.value('notes')} className={inputClass} placeholder="Ej.: viene en ayunas, traer estudios previos" />
        </Field>
      </FormSection>

      <FormActions cancelHref={cancelHref} submitLabel={submitLabel} />
    </form>
  )
}
