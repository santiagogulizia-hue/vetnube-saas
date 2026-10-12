'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireClinic } from '@/lib/clinic'
import { bool, dbErrorMessage, failure, text } from '@/lib/form'
import type { FormState } from '@/lib/form-state'
import { canDelete } from '@/lib/permissions'

function parseClient(fd: FormData) {
  const data = {
    first_name: text(fd, 'first_name'),
    last_name: text(fd, 'last_name') ?? '',
    document_id: text(fd, 'document_id'),
    phone: text(fd, 'phone'),
    whatsapp_opt_in: bool(fd, 'whatsapp_opt_in'),
    email: text(fd, 'email')?.toLowerCase() ?? null,
    address: text(fd, 'address'),
    city: text(fd, 'city'),
    notes: text(fd, 'notes'),
  }

  const errors: Record<string, string> = {}
  if (!data.first_name) errors.first_name = 'Ingresá el nombre.'
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'El email no es válido.'
  if (data.phone && data.phone.replace(/\D/g, '').length < 8) errors.phone = 'Incluí el código de área (mínimo 8 dígitos).'

  return { data, errors }
}

export async function createClientRecord(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, clinic, user } = await requireClinic()
  const { data, errors } = parseClient(fd)
  if (Object.keys(errors).length) return failure(fd, 'Revisá los campos marcados.', errors)

  const { data: row, error } = await supabase
    .from('clients')
    .insert({ ...data, clinic_id: clinic.id, created_by: user.id })
    .select('id')
    .single()
  if (error) return failure(fd, dbErrorMessage(error))

  revalidatePath('/clientes')
  // Después de crear el tutor, lo natural es cargar su mascota
  redirect(`/clientes/${row.id}?creado=1`)
}

export async function updateClientRecord(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, clinic } = await requireClinic()
  const { data, errors } = parseClient(fd)
  if (Object.keys(errors).length) return failure(fd, 'Revisá los campos marcados.', errors)

  const { error } = await supabase.from('clients').update(data).eq('id', id).eq('clinic_id', clinic.id)
  if (error) return failure(fd, dbErrorMessage(error))

  revalidatePath('/clientes')
  redirect(`/clientes/${id}`)
}

/** Baja lógica: el cliente deja de aparecer, pero su historial y ventas se conservan. */
export async function archiveClientRecord(id: string) {
  const { supabase, clinic } = await requireClinic()
  const back = (msg: string) => redirect(`/clientes/${id}/editar?error=${encodeURIComponent(msg)}`)

  if (!canDelete(clinic.role)) back('Solo el dueño/a o administración pueden dar de baja clientes.')

  const { count } = await supabase
    .from('pets')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', id)
    .is('deleted_at', null)
    .is('deceased_at', null)
  if (count) back('Este cliente tiene mascotas activas. Dalas de baja o registrá su fallecimiento primero.')

  const { error } = await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('clinic_id', clinic.id)
  if (error) back(dbErrorMessage(error))

  revalidatePath('/clientes')
  redirect('/clientes')
}
