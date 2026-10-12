'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireClinic } from '@/lib/clinic'
import { bool, dbErrorMessage, failure, isDate, oneOf, text, uuid } from '@/lib/form'
import type { FormState } from '@/lib/form-state'
import { todayIn } from '@/lib/format'
import { canDelete } from '@/lib/permissions'
import type { PetSex, Species } from '@/lib/types'

const SPECIES: Species[] = ['canino', 'felino', 'ave', 'conejo', 'roedor', 'reptil', 'exotico', 'otro']
const SEXES: PetSex[] = ['macho', 'hembra', 'desconocido']

function parsePet(fd: FormData, today: string) {
  const deceased = bool(fd, 'is_deceased')
  const data = {
    client_id: uuid(fd, 'client_id'),
    name: text(fd, 'name'),
    species: oneOf(fd, 'species', SPECIES),
    breed: text(fd, 'breed'),
    sex: oneOf(fd, 'sex', SEXES) ?? 'desconocido',
    birth_date: text(fd, 'birth_date'),
    birth_date_estimated: bool(fd, 'birth_date_estimated'),
    color: text(fd, 'color'),
    neutered: bool(fd, 'neutered'),
    microchip: text(fd, 'microchip')?.replace(/\s/g, '') ?? null,
    allergies: text(fd, 'allergies'),
    chronic_conditions: text(fd, 'chronic_conditions'),
    notes: text(fd, 'notes'),
    deceased_at: deceased ? text(fd, 'deceased_at') ?? today : null,
  }

  const errors: Record<string, string> = {}
  if (!data.client_id) errors.client_id = 'Elegí el tutor.'
  if (!data.name) errors.name = 'Ingresá el nombre.'
  if (!data.species) errors.species = 'Elegí la especie.'
  if (data.birth_date && (!isDate(data.birth_date) || data.birth_date > today)) errors.birth_date = 'La fecha no puede ser futura.'
  if (data.deceased_at && (!isDate(data.deceased_at) || data.deceased_at > today)) errors.deceased_at = 'La fecha no puede ser futura.'

  return { data, errors }
}

export async function createPet(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, clinic } = await requireClinic()
  const { data, errors } = parsePet(fd, todayIn(clinic.timezone))
  if (Object.keys(errors).length) return failure(fd, 'Revisá los campos marcados.', errors)

  const { data: row, error } = await supabase
    .from('pets')
    .insert({ ...data, clinic_id: clinic.id })
    .select('id')
    .single()
  if (error) return failure(fd, dbErrorMessage(error))

  revalidatePath('/pacientes')
  revalidatePath(`/clientes/${data.client_id}`)
  redirect(`/pacientes/${row.id}`)
}

export async function updatePet(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, clinic } = await requireClinic()
  const { data, errors } = parsePet(fd, todayIn(clinic.timezone))
  if (Object.keys(errors).length) return failure(fd, 'Revisá los campos marcados.', errors)

  const { error } = await supabase.from('pets').update(data).eq('id', id).eq('clinic_id', clinic.id)
  if (error) return failure(fd, dbErrorMessage(error))

  revalidatePath('/pacientes')
  redirect(`/pacientes/${id}`)
}

/** Baja lógica: se oculta de los listados pero su historia clínica se conserva. */
export async function archivePet(id: string) {
  const { supabase, clinic } = await requireClinic()
  const back = (msg: string) => redirect(`/pacientes/${id}/editar?error=${encodeURIComponent(msg)}`)
  if (!canDelete(clinic.role)) back('Solo el dueño/a o administración pueden dar de baja pacientes.')

  const { error } = await supabase
    .from('pets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('clinic_id', clinic.id)
  if (error) back(dbErrorMessage(error))

  revalidatePath('/pacientes')
  redirect('/pacientes')
}
