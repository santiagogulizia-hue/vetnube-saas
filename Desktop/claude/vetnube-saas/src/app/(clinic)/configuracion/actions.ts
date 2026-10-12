'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ACTIVE_CLINIC_COOKIE, getSession, requireClinic } from '@/lib/clinic'
import { dbErrorMessage, failure, oneOf, text } from '@/lib/form'
import type { FormState } from '@/lib/form-state'
import { withParam } from '@/lib/format'
import { canManageClinic, isOwner } from '@/lib/permissions'
import { COUNTRIES, CURRENCIES, SLOT_OPTIONS, TIMEZONES } from '@/lib/settings-options'
import type { MemberRole } from '@/lib/types'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const tabUrl = (tab: string) => `/configuracion?tab=${tab}`
const done = (tab: string, message: string): never => redirect(withParam(tabUrl(tab), 'ok', message))
const fail = (tab: string, message: string): never => redirect(withParam(tabUrl(tab), 'error', message))

// ---------------------------------------------------------------------------
// Datos de la clínica
// ---------------------------------------------------------------------------

export async function updateClinicData(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, clinic } = await requireClinic()
  if (!canManageClinic(clinic.role)) return failure(fd, 'Solo el dueño/a o administración pueden editar los datos de la clínica.')

  const data = {
    name: text(fd, 'name'),
    tax_id: text(fd, 'tax_id'),
    phone: text(fd, 'phone'),
    email: text(fd, 'email')?.toLowerCase() ?? null,
    address: text(fd, 'address'),
    city: text(fd, 'city'),
    country_code: oneOf(fd, 'country_code', COUNTRIES.map(([c]) => c)) ?? 'AR',
    timezone: oneOf(fd, 'timezone', TIMEZONES.map(([t]) => t)),
    currency: oneOf(fd, 'currency', CURRENCIES.map(([c]) => c)),
  }
  const errors: Record<string, string> = {}
  if (!data.name) errors.name = 'Ingresá el nombre de la clínica.'
  if (data.email && !EMAIL.test(data.email)) errors.email = 'El email no es válido.'
  if (!data.timezone) errors.timezone = 'Elegí la zona horaria.'
  if (!data.currency) errors.currency = 'Elegí la moneda.'
  if (Object.keys(errors).length) return failure(fd, 'Revisá los campos marcados.', errors)

  const { error } = await supabase.from('clinics').update(data).eq('id', clinic.id)
  if (error) return failure(fd, dbErrorMessage(error))

  revalidatePath('/', 'layout')
  return done('clinica', 'Datos de la clínica guardados.')
}

// ---------------------------------------------------------------------------
// Horario de la agenda (clinics.settings.agenda)
// ---------------------------------------------------------------------------

export async function updateAgendaSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, clinic } = await requireClinic()
  if (!canManageClinic(clinic.role)) return failure(fd, 'Solo el dueño/a o administración pueden cambiar el horario.')

  const start = Number(text(fd, 'start_hour'))
  const end = Number(text(fd, 'end_hour'))
  const slot = Number(text(fd, 'slot_minutes'))
  const errors: Record<string, string> = {}
  if (!Number.isInteger(start) || start < 0 || start > 23) errors.start_hour = 'Hora inválida.'
  if (!Number.isInteger(end) || end < 1 || end > 24) errors.end_hour = 'Hora inválida.'
  else if (end <= start) errors.end_hour = 'Tiene que ser posterior a la apertura.'
  if (!SLOT_OPTIONS.includes(slot)) errors.slot_minutes = 'Intervalo inválido.'
  if (Object.keys(errors).length) return failure(fd, 'Revisá los campos marcados.', errors)

  const settings = { ...(clinic.settings ?? {}), agenda: { start_hour: start, end_hour: end, slot_minutes: slot } }
  const { error } = await supabase.from('clinics').update({ settings }).eq('id', clinic.id)
  if (error) return failure(fd, dbErrorMessage(error))

  revalidatePath('/agenda')
  return done('agenda', 'Horario de la agenda guardado.')
}

// ---------------------------------------------------------------------------
// Mi perfil
// ---------------------------------------------------------------------------

export async function updateMyProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await getSession()
  const data = { full_name: text(fd, 'full_name'), phone: text(fd, 'phone'), license_number: text(fd, 'license_number') }
  if (!data.full_name) return failure(fd, 'Revisá los campos marcados.', { full_name: 'Ingresá tu nombre.' })

  const { error } = await supabase.from('profiles').update(data).eq('id', user.id)
  if (error) return failure(fd, dbErrorMessage(error))

  revalidatePath('/', 'layout')
  return done('perfil', 'Perfil actualizado.')
}

/** Cambia la clínica activa (para quien trabaja en más de una). */
export async function switchClinic(clinicId: string) {
  const { clinics } = await getSession()
  if (!clinics.some((c) => c.id === clinicId)) fail('perfil', 'No pertenecés a esa clínica.')
  ;(await cookies()).set(ACTIVE_CLINIC_COOKIE, clinicId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 })
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// ---------------------------------------------------------------------------
// Equipo e invitaciones
// ---------------------------------------------------------------------------

const INVITABLE: MemberRole[] = ['admin', 'vet', 'reception']

export async function createInvitation(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, clinic, user } = await requireClinic()
  if (!canManageClinic(clinic.role)) return failure(fd, 'Solo el dueño/a o administración pueden invitar.')

  const email = text(fd, 'email')?.toLowerCase() ?? null
  const role = oneOf(fd, 'role', INVITABLE)
  const errors: Record<string, string> = {}
  if (!email || !EMAIL.test(email)) errors.email = 'Ingresá un email válido.'
  if (!role) errors.role = 'Elegí el rol.'
  if (Object.keys(errors).length) return failure(fd, 'Revisá los campos marcados.', errors)

  // Una sola invitación pendiente por email: se reemplaza la anterior
  await supabase.from('clinic_invitations').delete().eq('clinic_id', clinic.id).eq('email', email).is('accepted_at', null)
  const { error } = await supabase.from('clinic_invitations').insert({ clinic_id: clinic.id, email, role, invited_by: user.id })
  if (error) return failure(fd, dbErrorMessage(error))

  revalidatePath('/configuracion')
  return done('equipo', `Invitación creada para ${email}. Copiá el link y envíaselo.`)
}

export async function revokeInvitation(id: string) {
  const { supabase, clinic } = await requireClinic()
  if (!canManageClinic(clinic.role)) fail('equipo', 'Solo el dueño/a o administración pueden revocar invitaciones.')
  const { error } = await supabase.from('clinic_invitations').delete().eq('id', id).eq('clinic_id', clinic.id)
  if (error) fail('equipo', dbErrorMessage(error))
  revalidatePath('/configuracion')
  done('equipo', 'Invitación revocada.')
}

export async function changeMemberRole(userId: string, fd: FormData) {
  const { supabase, clinic, user } = await requireClinic()
  const role = oneOf(fd, 'role', INVITABLE)
  if (!isOwner(clinic.role)) fail('equipo', 'Solo el dueño/a puede cambiar roles.')
  if (userId === user.id) fail('equipo', 'No podés cambiar tu propio rol.')
  if (!role) fail('equipo', 'Rol inválido.')

  const { error } = await supabase
    .from('clinic_members')
    .update({ role })
    .eq('clinic_id', clinic.id)
    .eq('user_id', userId)
    .neq('role', 'owner')
  if (error) fail('equipo', dbErrorMessage(error))
  revalidatePath('/configuracion')
  done('equipo', 'Rol actualizado.')
}

export async function setMemberActive(userId: string, active: boolean) {
  const { supabase, clinic, user } = await requireClinic()
  if (!isOwner(clinic.role)) fail('equipo', 'Solo el dueño/a puede dar de baja o reactivar miembros.')
  if (userId === user.id) fail('equipo', 'No podés darte de baja a vos mismo.')

  const { error } = await supabase
    .from('clinic_members')
    .update({ active })
    .eq('clinic_id', clinic.id)
    .eq('user_id', userId)
    .neq('role', 'owner')
  if (error) fail('equipo', dbErrorMessage(error))
  revalidatePath('/configuracion')
  done('equipo', active ? 'Miembro reactivado.' : 'Miembro dado de baja: ya no puede entrar a la clínica.')
}
