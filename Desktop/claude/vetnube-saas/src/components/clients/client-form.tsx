'use client'

import { useActionState } from 'react'
import { FormActions } from '@/components/forms/buttons'
import { Checkbox, Field, FormAlert, FormSection, errorProps, inputClass } from '@/components/forms/fields'
import { formDefaults, type FormState } from '@/lib/form-state'
import type { Client } from '@/lib/types'

type Props = {
  action: (state: FormState, fd: FormData) => Promise<FormState>
  client?: Partial<Client>
  cancelHref: string
  submitLabel: string
}

export function ClientForm({ action, client = { whatsapp_opt_in: true }, cancelHref, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state, client)

  const input = (name: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={name} name={name} defaultValue={f.value(name)} className={inputClass} {...errorProps(name, f.error(name))} {...props} />
  )

  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="space-y-5" noValidate>
      <FormAlert message={state?.error} />

      <FormSection title="Datos personales">
        <Field label="Nombre" htmlFor="first_name" required error={f.error('first_name')}>
          {input('first_name', { autoComplete: 'given-name', required: true })}
        </Field>
        <Field label="Apellido" htmlFor="last_name">
          {input('last_name', { autoComplete: 'family-name' })}
        </Field>
        <Field label="DNI / CUIT" htmlFor="document_id" hint="Opcional. No se puede repetir dentro de la clínica.">
          {input('document_id', { inputMode: 'numeric' })}
        </Field>
      </FormSection>

      <FormSection title="Contacto" description="El teléfono se usa para los recordatorios por WhatsApp.">
        <Field label="Teléfono (WhatsApp)" htmlFor="phone" error={f.error('phone')} hint="Con código de país y área. Ej.: +54 9 11 5555 0101">
          {input('phone', { type: 'tel', autoComplete: 'tel' })}
        </Field>
        <Field label="Email" htmlFor="email" error={f.error('email')}>
          {input('email', { type: 'email', autoComplete: 'email' })}
        </Field>
        <Field label="Dirección" htmlFor="address">
          {input('address', { autoComplete: 'street-address' })}
        </Field>
        <Field label="Localidad" htmlFor="city">
          {input('city', { autoComplete: 'address-level2' })}
        </Field>
        <Checkbox
          id="whatsapp_opt_in"
          name="whatsapp_opt_in"
          label="Acepta recibir recordatorios por WhatsApp"
          defaultChecked={f.checked('whatsapp_opt_in')}
        />
      </FormSection>

      <FormSection title="Notas internas">
        <Field label="Notas" htmlFor="notes" className="sm:col-span-2" hint="Solo las ve el equipo de la clínica.">
          <textarea id="notes" name="notes" rows={3} defaultValue={f.value('notes')} className={inputClass} />
        </Field>
      </FormSection>

      <FormActions cancelHref={cancelHref} submitLabel={submitLabel} />
    </form>
  )
}
