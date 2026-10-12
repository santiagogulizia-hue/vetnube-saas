'use client'

import { useActionState } from 'react'
import { FormActions } from '@/components/forms/buttons'
import { Field, FormAlert, FormSection, errorProps, inputClass } from '@/components/forms/fields'
import { formDefaults, type FormState } from '@/lib/form-state'
import { RECORD_TYPE, options } from '@/lib/labels'
import type { StaffMember } from '@/lib/staff'

type Props = {
  action: (state: FormState, fd: FormData) => Promise<FormState>
  initial: Record<string, unknown>
  vets: StaffMember[]
  cancelHref: string
  submitLabel: string
  /** Campos ocultos extra (por ejemplo, appointment_id cuando se atiende un turno) */
  hidden?: Record<string, string>
}

export function MedicalRecordForm({ action, initial, vets, cancelHref, submitLabel, hidden = {} }: Props) {
  const [state, formAction] = useActionState(action, null)
  const f = formDefaults(state, initial)

  const input = (name: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={name} name={name} defaultValue={f.value(name)} className={inputClass} {...errorProps(name, f.error(name))} {...props} />
  )
  const area = (name: string, rows = 3, placeholder?: string) => (
    <textarea id={name} name={name} rows={rows} defaultValue={f.value(name)} placeholder={placeholder} className={inputClass} />
  )
  const decimal = { inputMode: 'decimal' as const, autoComplete: 'off' }

  return (
    <form key={state?.submittedAt ?? 0} action={formAction} className="space-y-5" noValidate>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <FormAlert message={state?.error} />

      <FormSection title="Datos de la visita">
        <Field label="Fecha y hora" htmlFor="visit_at" required error={f.error('visit_at')}>
          {input('visit_at', { type: 'datetime-local', required: true })}
        </Field>
        <Field label="Tipo de registro" htmlFor="record_type">
          <select id="record_type" name="record_type" defaultValue={f.value('record_type') || 'consulta'} className={inputClass}>
            {options(RECORD_TYPE).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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
        <Field label="Motivo de consulta" htmlFor="reason" required error={f.error('reason')}>
          {input('reason', { required: true, placeholder: 'Ej.: vómitos desde hace 2 días' })}
        </Field>
      </FormSection>

      <FormSection title="Anamnesis y examen">
        <Field label="Anamnesis" htmlFor="anamnesis" className="sm:col-span-2" hint="Relato del tutor, evolución, alimentación, medicación previa.">
          {area('anamnesis', 4)}
        </Field>
        <Field label="Examen físico" htmlFor="physical_exam" className="sm:col-span-2">
          {area('physical_exam', 3, 'Hallazgos por sistema')}
        </Field>
      </FormSection>

      <FormSection title="Signos vitales" description="Opcionales. El peso actualiza la ficha y la curva de peso del paciente.">
        <div className="grid grid-cols-2 gap-4 sm:col-span-2 lg:grid-cols-4">
          <Field label="Peso (kg)" htmlFor="weight_kg" error={f.error('weight_kg')}>
            {input('weight_kg', decimal)}
          </Field>
          <Field label="Temperatura (°C)" htmlFor="temperature_c" error={f.error('temperature_c')}>
            {input('temperature_c', decimal)}
          </Field>
          <Field label="Frec. cardíaca (lpm)" htmlFor="heart_rate_bpm" error={f.error('heart_rate_bpm')}>
            {input('heart_rate_bpm', { inputMode: 'numeric' })}
          </Field>
          <Field label="Frec. respiratoria (rpm)" htmlFor="respiratory_rate_rpm" error={f.error('respiratory_rate_rpm')}>
            {input('respiratory_rate_rpm', { inputMode: 'numeric' })}
          </Field>
          <Field label="Mucosas" htmlFor="mucous_membranes">
            {input('mucous_membranes', { placeholder: 'Rosadas, húmedas' })}
          </Field>
          <Field label="TLLC (s)" htmlFor="capillary_refill_s" error={f.error('capillary_refill_s')} hint="Llenado capilar">
            {input('capillary_refill_s', decimal)}
          </Field>
          <Field label="Condición corporal" htmlFor="body_condition_score" error={f.error('body_condition_score')} hint="Escala 1 a 9">
            {input('body_condition_score', { type: 'number', min: 1, max: 9, step: 1 })}
          </Field>
        </div>
      </FormSection>

      <FormSection title="Diagnóstico y plan">
        <Field label="Diagnóstico" htmlFor="diagnosis" className="sm:col-span-2" hint="Presuntivo o definitivo.">
          {area('diagnosis', 2)}
        </Field>
        <Field label="Tratamiento" htmlFor="treatment" className="sm:col-span-2">
          {area('treatment', 3, 'Procedimientos realizados y plan terapéutico')}
        </Field>
        <Field label="Receta / indicaciones al tutor" htmlFor="prescription" className="sm:col-span-2">
          {area('prescription', 3, 'Ej.: Amoxicilina 250 mg, 1 comprimido cada 12 h durante 7 días')}
        </Field>
        <Field label="Próximo control" htmlFor="next_control_on" error={f.error('next_control_on')}>
          {input('next_control_on', { type: 'date' })}
        </Field>
      </FormSection>

      <FormActions cancelHref={cancelHref} submitLabel={submitLabel} />
    </form>
  )
}
