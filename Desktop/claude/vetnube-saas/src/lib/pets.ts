import { notFound } from 'next/navigation'
import type { ServerSupabase } from '@/lib/supabase/server'
import type { Pet } from '@/lib/types'

/** Carga un paciente de la clínica o responde 404. */
export async function getPetOr404(supabase: ServerSupabase, clinicId: string, petId: string) {
  const { data } = await supabase
    .from('pets')
    .select('id, name, species, allergies, chronic_conditions, deceased_at')
    .eq('id', petId)
    .eq('clinic_id', clinicId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!data) notFound()
  return data as Pick<Pet, 'id' | 'name' | 'species' | 'allergies' | 'chronic_conditions' | 'deceased_at'>
}

/** Pacientes activos para el buscador de turnos (con nombre y teléfono del tutor). */
export async function loadPetOptions(supabase: ServerSupabase, clinicId: string) {
  const { data } = await supabase
    .from('pets')
    .select('id, name, species, client:clients(first_name, last_name, phone)')
    .eq('clinic_id', clinicId)
    .is('deleted_at', null)
    .is('deceased_at', null)
    .order('name')
    .limit(3000)
  const rows = (data ?? []) as unknown as {
    id: string
    name: string
    species: Pet['species']
    client: { first_name: string; last_name: string; phone: string | null } | null
  }[]
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    species: p.species,
    tutor: p.client ? `${p.client.first_name} ${p.client.last_name}`.trim() : 'Sin tutor',
    phone: p.client?.phone ?? null,
  }))
}
