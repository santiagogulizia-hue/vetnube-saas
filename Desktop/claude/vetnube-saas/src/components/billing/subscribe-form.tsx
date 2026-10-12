'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/components/forms/buttons'
import { Field, FormAlert, errorProps, inputClass } from '@/components/forms/fields'
import { formDefaults, type FormState } from '@/lib/form-state'

type Props = {
  action: (state: FormState, fd: FormData) => Promise<FormState>
  defaultEmail: string
  label: string
}

/** Pide el email de la cuenta de Mercado Pago que paga y lleva al checkout. */
export function SubscribeForm({ action, defaultEmail, label }: Props) {
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state, { payer_email: defaultEmail })
  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="space-y-3" noValidate>
      <FormAlert message={state?.error} />
      <Field
        label="Email de la cuenta de Mercado Pago"
        htmlFor="payer_email"
        required
        error={f.error('payer_email')}
        hint="Es la cuenta desde la que se va a debitar el plan todos los meses."
      >
        <input id="payer_email" name="payer_email" type="email" defaultValue={f.value('payer_email')} className={inputClass} {...errorProps('payer_email', f.error('payer_email'))} />
      </Field>
      <SubmitButton pendingText="Conectando con Mercado Pago…">{label}</SubmitButton>
    </form>
  )
}
