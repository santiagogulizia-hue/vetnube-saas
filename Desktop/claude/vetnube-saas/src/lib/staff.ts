import type { ServerSupabase } from '@/lib/supabase/server'

export type StaffMember = { id: string; name: string }

/** Profesionales que pueden firmar consultas (owner, admin y vet activos). */
export async function getVets(supabase: ServerSupabase, clinicId: string): Promise<StaffMember[]> {
  const { data } = await supabase
    .from('clinic_members')
    .select('user_id, profile:profiles(full_name)')
    .eq('clinic_id', clinicId)
    .eq('active', true)
    .in('role', ['owner', 'admin', 'vet'])

  const rows = (data ?? []) as unknown as { user_id: string; profile: { full_name: string | null } | null }[]
  return rows
    .map((m) => ({ id: m.user_id, name: m.profile?.full_name || 'Sin nombre' }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
