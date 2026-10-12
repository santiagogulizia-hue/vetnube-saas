'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { DURATIONS, agendaHref } from '@/lib/agenda'
import { requireClinic } from '@/lib/clinic'
import { dbErrorMessage, failure, isDate, oneOf, text, uuid } from '@/lib/form'
import type { FormState } from '@/lib/form-state'
import { fromLocalInput, safeNext, withParam } from '@/lib/format'
import { canDelete, canWriteClinical } from '@/lib/permissions'
import type { AppointmentStatus, AppointmentType } from '@/lib/types'

const TYPES: AppointmentType[] = ['consulta', 'control', 'cirugia', 'vacunacion', 'peluqueria', 'otro']
const STATUSES: AppointmentStatus[] = ['pendiente', 'confirmado', 'en_espera', 'en_atencion', 'atendido', 'cancelado', 'ausente']

function parseAppointment(fd: FormData, timeZone: string) {
  const date = text(fd, 'date')
  const time = text(fd, 'time')
  const duration = Number(text(fd, 'duration') ?? 30)
  const startsAt = isDate(date) && time && /^\d{2}:\d{2}$/.test(time) ? fromLocalInput(`${date}T${time}`, timeZone) : null

  const data = {
    pet_id: uuid(fd, 'pet_id'),
    type: oneOf(fd, 'type', TYPES) ?? 'consulta',
    vet_id: uuid(fd, 'vet_id'),
    status: oneOf(fd, 'status', STATUSES) ?? 'pendiente',
    reason: text(fd, 'reason'),
    notes: text(fd, 'notes'),
    starts_at: startsAt,
    ends_at: startsAt ? new Date(Date.parse(startsAt) + duration * 60_000).toISOString() : null,
  }

  const errors: Record<string, string> = {}
  if (!data.pet_id) errors.pet_id = 'Elegí el paciente.'
  if (!isDate(date)) errors.date = 'Elegí la fecha.'
  if (!startsAt) errors.time = 'Elegí la hora.'
  if (!DURATIONS.includes(duration)) errors.duration = 'Duración inválida.'

  return { data, date, errors }
}

export async function saveAppointment(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, clinic, user } = await requireClinic()
  const { data, date, errors } = parseAppointment(fd, clinic.timezone)
  if (Object.keys(errors).length) return failure(fd, 'Revisá los campos marcados.', errors)

  const { error } = id
    ? await supabase.from('appointments').update(data).eq('id', id).eq('clinic_id', clinic.id)
    : await supabase.from('appointments').insert({ ...data, clinic_id: clinic.id, created_by: user.id })
  if (error) return failure(fd, dbErrorMessage(error))

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  redirect(safeNext(fd.get('return_to'), agendaHref({ vista: 'dia', fecha: date as string })))
}

/** Cambio rápido de estado desde la agenda, la sala de espera o el detalle del turno. */
export async function setAppointmentStatus(id: string, status: AppointmentStatus, returnTo: string) {
  const { supabase, clinic } = await requireClinic()
  const back = safeNext(returnTo, '/agenda')

  const { error } = await supabase.from('appointments').update({ status }).eq('id', id).eq('clinic_id', clinic.id)
  if (error) redirect(withParam(back, 'error', dbErrorMessage(error)))

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  redirect(back)
}

/** "Atender": pasa el turno a consultorio y abre la consulta vinculada en la historia clínica. */
export async function startAttention(id: string, returnTo: string) {
  const { supabase, clinic } = await requireClinic()
  const back = safeNext(returnTo, '/agenda')

  const { data: appt, error } = await supabase
    .from('appointments')
    .update({ status: 'en_atencion' })
    .eq('id', id)
    .eq('clinic_id', clinic.id)
    .select('pet_id')
    .single()
  if (error) redirect(withParam(back, 'error', dbErrorMessage(error)))

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  if (!canWriteClinical(clinic.role)) redirect(back)
  redirect(`/pacientes/${appt.pet_id}/consultas/nueva?turno=${id}`)
}

export async function deleteAppointment(id: string, returnTo: string) {
  const { supabase, clinic } = await requireClinic()
  const back = safeNext(returnTo, '/agenda')
  if (!canDelete(clinic.role)) {
    redirect(withParam(`/agenda/${id}`, 'error', 'Solo el dueño/a o administración pueden borrar turnos. Podés cancelarlo.'))
  }

  const { error } = await supabase.from('appointments').delete().eq('id', id).eq('clinic_id', clinic.id)
  if (error) redirect(withParam(`/agenda/${id}`, 'error', dbErrorMessage(error)))

  revalidatePath('/agenda')
  revalidatePath('/dashboard')
  redirect(back)
}
