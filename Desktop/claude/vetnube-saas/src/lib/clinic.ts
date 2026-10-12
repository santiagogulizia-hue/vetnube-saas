import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Clinic, MemberRole, SessionUser } from '@/lib/types'

/** Cookie con la clínica activa (para quien pertenece a más de una). */
export const ACTIVE_CLINIC_COOKIE = 'vn_clinic'

type MembershipRow = { role: MemberRole; clinic: Omit<Clinic, 'role'> | null }

/**
 * Usuario logueado + clínica activa. `cache` evita repetir las consultas
 * cuando el layout y la página lo piden en el mismo request.
 * La clínica activa es la elegida en la cookie o, si no hay, la primera membresía.
 */
export const getSession = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: memberships }, cookieStore] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase
      .from('clinic_members')
      .select('role, clinic:clinics(id, name, timezone, currency, settings)')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at'),
    cookies(),
  ])

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email ?? '',
    fullName: profile?.full_name || user.email?.split('@')[0] || 'Usuario',
  }

  const rows = ((memberships ?? []) as unknown as MembershipRow[]).filter((m) => m.clinic)
  const preferred = cookieStore.get(ACTIVE_CLINIC_COOKIE)?.value
  const active = rows.find((m) => m.clinic!.id === preferred) ?? rows[0]
  const clinic: Clinic | null = active ? { ...active.clinic!, role: active.role } : null
  const clinics = rows.map((m) => ({ id: m.clinic!.id, name: m.clinic!.name, role: m.role }))

  return { supabase, user: sessionUser, clinic, clinics }
})

/** Igual que getSession, pero manda al onboarding si el usuario todavía no tiene clínica. */
export async function requireClinic() {
  const session = await getSession()
  if (!session.clinic) redirect('/onboarding')
  return { ...session, clinic: session.clinic }
}
