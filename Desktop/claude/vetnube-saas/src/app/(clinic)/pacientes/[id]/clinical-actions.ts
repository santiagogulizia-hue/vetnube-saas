'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireClinic } from '@/lib/clinic'
import { dbErrorMessage, failure, isDate, num, oneOf, text, uuid } from '@/lib/form'
import type { FormState } from '@/lib/form-state'
import { fromLocalInput, todayIn } from '@/lib/format'
import { canDelete, canWriteClinical } from '@/lib/permissions'
import type { ImmunizationKind, RecordType } from '@/lib/types'

const RECORD_TYPES: RecordType[] = ['consulta', 'control', 'cirugia', 'urgencia', 'internacion', 'nota']
const KINDS: ImmunizationKind[] = ['vacuna', 'desparasitacion_interna', 'desparasitacion_externa']

const petUrl = (petId: string, tab?: string) => `/pacientes/${petId}${tab ? `?tab=${tab}` : ''}`

/** Rangos fisiológicos amplios (cubren desde aves hasta perros gigantes) para frenar errores de tipeo. */
function checkRange(errors: Record<string, string>, key: string, value: number | null, min: number, max: number, unit: string) {
  if (value === null) return
  if (Number.isNaN(value) || value < min || value > max) errors[key] = `Valor entre ${min} y ${max} ${unit}.`
}

// ---------------------------------------------------------------------------
// Consultas (medical_records)
// ---------------------------------------------------------------------------

function parseRecord(fd: FormData, timeZone: string) {
  const data = {
    record_type: oneOf(fd, 'record_type', RECORD_TYPES) ?? 'consulta',
    visit_at: fromLocalInput(text(fd, 'visit_at'), timeZone),
    vet_id: uuid(fd, 'vet_id'),
    reason: text(fd, 'reason'),
    anamnesis: text(fd, 'anamnesis'),
    physical_exam: text(fd, 'physical_exam'),
    weight_kg: num(fd, 'weight_kg'),
    temperature_c: num(fd, 'temperature_c'),
    heart_rate_bpm: num(fd, 'heart_rate_bpm'),
    respiratory_rate_rpm: num(fd, 'respiratory_rate_rpm'),
    mucous_membranes: text(fd, 'mucous_membranes'),
    capillary_refill_s: num(fd, 'capillary_refill_s'),
    body_condition_score: num(fd, 'body_condition_score'),
    diagnosis: text(fd, 'diagnosis'),
    treatment: text(fd, 'treatment'),
    prescription: text(fd, 'prescription'),
    next_control_on: text(fd, 'next_control_on'),
  }

  const errors: Record<string, string> = {}
  if (!data.visit_at) errors.visit_at = 'Indicá fecha y hora.'
  if (!data.reason) errors.reason = 'Indicá el motivo de la consulta.'
  checkRange(errors, 'weight_kg', data.weight_kg, 0.01, 200, 'kg')
  checkRange(errors, 'temperature_c', data.temperature_c, 25, 45, '°C')
  checkRange(errors, 'heart_rate_bpm', data.heart_rate_bpm, 1, 1000, 'lpm')
  checkRange(errors, 'respiratory_rate_rpm', data.respiratory_rate_rpm, 1, 300, 'rpm')
  checkRange(errors, 'capillary_refill_s', data.capillary_refill_s, 0, 10, 's')
  checkRange(errors, 'body_condition_score', data.body_condition_score, 1, 9, '')
  if (data.heart_rate_bpm !== null && !Number.isInteger(data.heart_rate_bpm)) errors.heart_rate_bpm = 'Número entero.'
  if (data.respiratory_rate_rpm !== null && !Number.isInteger(data.respiratory_rate_rpm)) errors.respiratory_rate_rpm = 'Número entero.'
  if (data.body_condition_score !== null && !Number.isInteger(data.body_condition_score)) errors.body_condition_score = 'Número entero del 1 al 9.'
  if (data.next_control_on && !isDate(data.next_control_on)) errors.next_control_on = 'Fecha inválida.'

  return { data, errors }
}

export async function saveMedicalRecord(
  petId: string,
  recordId: string | null,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase, clinic, user } = await requireClinic()
  if (!canWriteClinical(clinic.role)) return failure(fd, 'Solo los veterinarios y la administración pueden cargar consultas.')

  const { data, errors } = parseRecord(fd, clinic.timezone)
  if (Object.keys(errors).length) return failure(fd, 'Revisá los campos marcados.', errors)

  // Consulta iniciada desde "Atender" en la agenda: queda vinculada al turno
  const appointmentId = recordId ? null : uuid(fd, 'appointment_id')

  const { error } = recordId
    ? await supabase.from('medical_records').update(data).eq('id', recordId).eq('clinic_id', clinic.id)
    : await supabase
        .from('medical_records')
        .insert({ ...data, appointment_id: appointmentId, pet_id: petId, clinic_id: clinic.id, created_by: user.id })
  if (error) return failure(fd, dbErrorMessage(error))

  if (appointmentId) {
    await supabase.from('appointments').update({ status: 'atendido' }).eq('id', appointmentId).eq('clinic_id', clinic.id)
    revalidatePath('/agenda')
    revalidatePath('/dashboard')
  }

  revalidatePath(`/pacientes/${petId}`)
  redirect(petUrl(petId, 'historia'))
}

export async function deleteMedicalRecord(petId: string, recordId: string) {
  const { supabase, clinic } = await requireClinic()
  if (!canDelete(clinic.role)) {
    redirect(`${petUrl(petId, 'historia')}&error=${encodeURIComponent('Solo el dueño/a o administración pueden borrar consultas.')}`)
  }
  const { error } = await supabase.from('medical_records').delete().eq('id', recordId).eq('clinic_id', clinic.id)
  if (error) redirect(`${petUrl(petId, 'historia')}&error=${encodeURIComponent(dbErrorMessage(error))}`)

  revalidatePath(`/pacientes/${petId}`)
  redirect(petUrl(petId, 'historia'))
}

// ---------------------------------------------------------------------------
// Vacunas y desparasitaciones (immunizations)
// ---------------------------------------------------------------------------

function parseImmunization(fd: FormData, today: string) {
  const data = {
    kind: oneOf(fd, 'kind', KINDS),
    name: text(fd, 'name'),
    batch_number: text(fd, 'batch_number'),
    applied_on: text(fd, 'applied_on'),
    next_due_on: text(fd, 'next_due_on'),
    vet_id: uuid(fd, 'vet_id'),
    notes: text(fd, 'notes'),
  }

  const errors: Record<string, string> = {}
  if (!data.kind) errors.kind = 'Elegí el tipo.'
  if (!data.name) errors.name = 'Indicá el producto o la vacuna.'
  if (!isDate(data.applied_on)) errors.applied_on = 'Indicá la fecha de aplicación.'
  else if (data.applied_on > today) errors.applied_on = 'La fecha de aplicación no puede ser futura.'
  if (data.next_due_on && (!isDate(data.next_due_on) || (data.applied_on && data.next_due_on <= data.applied_on))) {
    errors.next_due_on = 'Debe ser posterior a la fecha de aplicación.'
  }

  return { data, errors }
}

export async function saveImmunization(
  petId: string,
  immunizationId: string | null,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase, clinic } = await requireClinic()
  const { data, errors } = parseImmunization(fd, todayIn(clinic.timezone))
  if (Object.keys(errors).length) return failure(fd, 'Revisá los campos marcados.', errors)

  const { error } = immunizationId
    ? await supabase.from('immunizations').update(data).eq('id', immunizationId).eq('clinic_id', clinic.id)
    : await supabase.from('immunizations').insert({ ...data, pet_id: petId, clinic_id: clinic.id })
  if (error) return failure(fd, dbErrorMessage(error))

  revalidatePath(`/pacientes/${petId}`)
  revalidatePath('/dashboard')
  redirect(petUrl(petId, 'vacunas'))
}

export async function deleteImmunization(petId: string, immunizationId: string) {
  const { supabase, clinic } = await requireClinic()
  const { error } = await supabase.from('immunizations').delete().eq('id', immunizationId).eq('clinic_id', clinic.id)
  // RLS: solo owner/admin pueden borrar; para el resto la fila no cambia
  if (error) redirect(`${petUrl(petId, 'vacunas')}&error=${encodeURIComponent(dbErrorMessage(error))}`)

  revalidatePath(`/pacientes/${petId}`)
  redirect(petUrl(petId, 'vacunas'))
}

// ---------------------------------------------------------------------------
// Archivos adjuntos: la subida va directo del navegador a Storage (sin límite
// de tamaño de Server Actions); acá solo se borra.
// ---------------------------------------------------------------------------

export async function deleteAttachment(petId: string, attachmentId: string) {
  const { supabase, clinic } = await requireClinic()
  const back = (msg: string) => redirect(`${petUrl(petId, 'archivos')}&error=${encodeURIComponent(msg)}`)
  if (!canDelete(clinic.role)) back('Solo el dueño/a o administración pueden borrar archivos.')

  const { data: file } = await supabase
    .from('attachments')
    .select('storage_path')
    .eq('id', attachmentId)
    .eq('clinic_id', clinic.id)
    .maybeSingle()
  if (!file) back('El archivo ya no existe.')

  const { error: storageError } = await supabase.storage.from('clinic-files').remove([file!.storage_path as string])
  if (storageError) back(`No se pudo borrar el archivo: ${storageError.message}`)

  const { error } = await supabase.from('attachments').delete().eq('id', attachmentId)
  if (error) back(dbErrorMessage(error))

  revalidatePath(`/pacientes/${petId}`)
  redirect(petUrl(petId, 'archivos'))
}
