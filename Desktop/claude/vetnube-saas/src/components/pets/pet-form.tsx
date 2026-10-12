'use client'

import { useActionState, useState } from 'react'
import { FormActions } from '@/components/forms/buttons'
import { Checkbox, Field, FormAlert, FormSection, errorProps, inputClass } from '@/components/forms/fields'
import { formDefaults, type FormState } from '@/lib/form-state'
import { PET_SEX, SPECIES, options } from '@/lib/labels'
import type { Pet } from '@/lib/types'

type Props = {
  action: (state: FormState, fd: FormData) => Promise<FormState>
  pet?: Partial<Pet>
  clients: { id: string; name: string }[]
  /** Si viene, el tutor queda fijo (alta desde la ficha del cliente) */
  lockedClient?: { id: string; name: string }
  cancelHref: string
  submitLabel: string
  today: string
}

export function PetForm({ action, pet = {}, clients, lockedClient, cancelHref, submitLabel, today }: Props) {
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state, { ...pet, client_id: pet.client_id ?? lockedClient?.id, is_deceased: Boolean(pet.deceased_at) })
  const [deceased, setDeceased] = useState(f.checked('is_deceased'))

  const input = (name: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={name} name={name} defaultValue={f.value(name)} className={inputClass} {...errorProps(name, f.error(name))} {...props} />
  )

  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="space-y-5" noValidate>
      <FormAlert message={state?.error} />

      <FormSection title="Identificación">
        <Field label="Nombre" htmlFor="name" required error={f.error('name')}>
          {input('name', { required: true })}
        </Field>
        <Field label="Tutor" htmlFor="client_id" required error={f.error('client_id')}>
          {lockedClient ? (
            <>
              <input type="hidden" name="client_id" value={lockedClient.id} />
              <input id="client_id" value={lockedClient.name} disabled className={inputClass} />
            </>
          ) : (
            <select id="client_id" name="client_id" defaultValue={f.value('client_id')} className={inputClass} {...errorProps('client_id', f.error('client_id'))}>
              <option value="">Elegí un cliente…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Especie" htmlFor="species" required error={f.error('species')}>
          <select id="species" name="species" defaultValue={f.value('species') || 'canino'} className={inputClass}>
            {options(SPECIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Raza" htmlFor="breed">
          {input('breed', { placeholder: 'Ej.: Mestizo, Labrador' })}
        </Field>
        <Field label="Sexo" htmlFor="sex">
          <select id="sex" name="sex" defaultValue={f.value('sex') || 'desconocido'} className={inputClass}>
            {options(PET_SEX).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Pelaje / color" htmlFor="color">
          {input('color')}
        </Field>
        <Field label="Fecha de nacimiento" htmlFor="birth_date" error={f.error('birth_date')}>
          {input('birth_date', { type: 'date', max: today })}
        </Field>
        <Checkbox id="birth_date_estimated" name="birth_date_estimated" label="La fecha es aproximada" defaultChecked={f.checked('birth_date_estimated')} />
        <Field label="Microchip" htmlFor="microchip" hint="15 dígitos ISO. No se puede repetir.">
          {input('microchip', { inputMode: 'numeric' })}
        </Field>
        <Checkbox id="neutered" name="neutered" label="Castrado/a" defaultChecked={f.checked('neutered')} />
      </FormSection>

      <FormSection title="Alertas clínicas" description="Se muestran resaltadas en la ficha y en cada consulta.">
        <Field label="Alergias" htmlFor="allergies" className="sm:col-span-2">
          <textarea id="allergies" name="allergies" rows={2} defaultValue={f.value('allergies')} className={inputClass} placeholder="Ej.: alergia a la penicilina" />
        </Field>
        <Field label="Enfermedades crónicas" htmlFor="chronic_conditions" className="sm:col-span-2">
          <textarea id="chronic_conditions" name="chronic_conditions" rows={2} defaultValue={f.value('chronic_conditions')} className={inputClass} placeholder="Ej.: insuficiencia renal crónica, cardiopatía" />
        </Field>
        <Field label="Notas" htmlFor="notes" className="sm:col-span-2" hint="Comportamiento, manejo, preferencias del tutor.">
          <textarea id="notes" name="notes" rows={2} defaultValue={f.value('notes')} className={inputClass} />
        </Field>
      </FormSection>

      {pet.id && (
        <FormSection title="Estado">
          <label htmlFor="is_deceased" className="flex items-center gap-2.5 text-sm font-semibold">
            <input
              id="is_deceased"
              name="is_deceased"
              type="checkbox"
              checked={deceased}
              onChange={(e) => setDeceased(e.target.checked)}
              className="size-4 accent-brand-600"
            />
            Registrar fallecimiento
          </label>
          {deceased && (
            <Field label="Fecha de fallecimiento" htmlFor="deceased_at" error={f.error('deceased_at')}>
              {input('deceased_at', { type: 'date', max: today, defaultValue: f.value('deceased_at') || today })}
            </Field>
          )}
        </FormSection>
      )}

      <FormActions cancelHref={cancelHref} submitLabel={submitLabel} />
    </form>
  )
}
