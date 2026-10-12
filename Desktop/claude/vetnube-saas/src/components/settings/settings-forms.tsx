'use client'

import { useActionState, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { SubmitButton } from '@/components/forms/buttons'
import { Field, FormAlert, FormSection, errorProps, inputClass } from '@/components/forms/fields'
import { formDefaults, type FormState } from '@/lib/form-state'
import { ROLE_LABEL } from '@/lib/labels'
import { COUNTRIES, CURRENCIES, SLOT_OPTIONS, TIMEZONES } from '@/lib/settings-options'

type Action = (state: FormState, fd: FormData) => Promise<FormState>

function Select({ name, value, items, error }: { name: string; value: string; items: readonly (readonly [string, string])[]; error?: string }) {
  return (
    <select id={name} name={name} defaultValue={value} className={inputClass} {...errorProps(name, error)}>
      {items.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  )
}

export function ClinicDataForm({ action, initial, readOnly }: { action: Action; initial: Record<string, unknown>; readOnly: boolean }) {
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state, initial)
  const input = (name: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={name} name={name} defaultValue={f.value(name)} disabled={readOnly} className={inputClass} {...errorProps(name, f.error(name))} {...props} />
  )

  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="space-y-5" noValidate>
      <FormAlert message={state?.error} />
      <fieldset disabled={readOnly} className="space-y-5">
        <FormSection title="Identidad" description="Aparece en el menú, los comprobantes y los mensajes a los clientes.">
          <Field label="Nombre de la clínica" htmlFor="name" required error={f.error('name')}>
            {input('name')}
          </Field>
          <Field label="CUIT / identificación fiscal" htmlFor="tax_id">
            {input('tax_id')}
          </Field>
        </FormSection>
        <FormSection title="Contacto">
          <Field label="Teléfono" htmlFor="phone">
            {input('phone', { type: 'tel' })}
          </Field>
          <Field label="Email" htmlFor="email" error={f.error('email')}>
            {input('email', { type: 'email' })}
          </Field>
          <Field label="Dirección" htmlFor="address">
            {input('address')}
          </Field>
          <Field label="Localidad" htmlFor="city">
            {input('city')}
          </Field>
        </FormSection>
        <FormSection title="Región" description="La zona horaria define el «hoy» de la agenda, la caja y los reportes.">
          <Field label="País" htmlFor="country_code">
            <Select name="country_code" value={f.value('country_code')} items={COUNTRIES} />
          </Field>
          <Field label="Zona horaria" htmlFor="timezone" error={f.error('timezone')}>
            <Select name="timezone" value={f.value('timezone')} items={TIMEZONES} error={f.error('timezone')} />
          </Field>
          <Field label="Moneda" htmlFor="currency" error={f.error('currency')}>
            <Select name="currency" value={f.value('currency')} items={CURRENCIES} error={f.error('currency')} />
          </Field>
        </FormSection>
      </fieldset>
      {!readOnly && (
        <div className="flex justify-end">
          <SubmitButton>Guardar datos</SubmitButton>
        </div>
      )}
    </form>
  )
}

const hourOptions = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => [String(from + i), `${String(from + i).padStart(2, '0')}:00`] as const)

export function AgendaSettingsForm({ action, initial, readOnly }: { action: Action; initial: Record<string, unknown>; readOnly: boolean }) {
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state, initial)
  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="space-y-5" noValidate>
      <FormAlert message={state?.error} />
      <fieldset disabled={readOnly}>
        <FormSection
          title="Horario de atención"
          description="Define las horas visibles en la grilla de la agenda. Los turnos fuera de horario se siguen mostrando."
        >
          <Field label="Apertura" htmlFor="start_hour" error={f.error('start_hour')}>
            <Select name="start_hour" value={f.value('start_hour')} items={hourOptions(0, 23)} />
          </Field>
          <Field label="Cierre" htmlFor="end_hour" error={f.error('end_hour')}>
            <Select name="end_hour" value={f.value('end_hour')} items={hourOptions(1, 24)} />
          </Field>
          <Field label="Intervalo de la grilla" htmlFor="slot_minutes" error={f.error('slot_minutes')} hint="Cada cuántos minutos se puede agendar con un clic.">
            <Select name="slot_minutes" value={f.value('slot_minutes')} items={SLOT_OPTIONS.map((m) => [String(m), `${m} minutos`] as const)} />
          </Field>
        </FormSection>
      </fieldset>
      {!readOnly && (
        <div className="flex justify-end">
          <SubmitButton>Guardar horario</SubmitButton>
        </div>
      )}
    </form>
  )
}

export function ProfileForm({ action, initial, email }: { action: Action; initial: Record<string, unknown>; email: string }) {
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state, initial)
  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="space-y-5" noValidate>
      <FormAlert message={state?.error} />
      <FormSection title="Mis datos" description="Tu nombre aparece en las consultas que firmás y en los turnos asignados.">
        <Field label="Nombre y apellido" htmlFor="full_name" required error={f.error('full_name')}>
          <input id="full_name" name="full_name" defaultValue={f.value('full_name')} className={inputClass} {...errorProps('full_name', f.error('full_name'))} />
        </Field>
        <Field label="Email" htmlFor="profile_email" hint="Es tu usuario para ingresar.">
          <input id="profile_email" value={email} disabled className={inputClass} />
        </Field>
        <Field label="Teléfono" htmlFor="profile_phone">
          <input id="profile_phone" name="phone" type="tel" defaultValue={f.value('phone')} className={inputClass} />
        </Field>
        <Field label="Matrícula profesional" htmlFor="license_number" hint="Solo para veterinarios.">
          <input id="license_number" name="license_number" defaultValue={f.value('license_number')} className={inputClass} />
        </Field>
      </FormSection>
      <div className="flex justify-end">
        <SubmitButton>Guardar perfil</SubmitButton>
      </div>
    </form>
  )
}

export function InviteForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state, { role: 'vet' })
  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="space-y-3" noValidate>
      <FormAlert message={state?.error} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
        <Field label="Email de la persona" htmlFor="invite_email" required error={f.error('email')}>
          <input id="invite_email" name="email" type="email" defaultValue={f.value('email')} placeholder="nombre@ejemplo.com" className={inputClass} {...errorProps('invite_email', f.error('email'))} />
        </Field>
        <Field label="Rol" htmlFor="invite_role" error={f.error('role')}>
          <select id="invite_role" name="role" defaultValue={f.value('role')} className={inputClass}>
            {(['vet', 'reception', 'admin'] as const).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>
        <div className={f.error('email') || f.error('role') ? 'sm:mb-5' : ''}>
          <SubmitButton pendingText="Creando…">Crear invitación</SubmitButton>
        </div>
      </div>
    </form>
  )
}

export function CopyButton({ text, label = 'Copiar link' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          window.prompt('Copiá el link:', text)
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-bold hover:border-brand-500"
    >
      {copied ? <Check className="size-3.5 text-emerald-600" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? 'Copiado' : label}
    </button>
  )
}
