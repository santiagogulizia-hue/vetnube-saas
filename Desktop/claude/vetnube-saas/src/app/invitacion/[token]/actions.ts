'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ACTIVE_CLINIC_COOKIE } from '@/lib/clinic'
import { createClient } from '@/lib/supabase/server'

export async function acceptInvitation(token: string) {
  const supabase = await createClient()
  const { data: clinicId, error } = await supabase.rpc('accept_invitation', { p_token: token })
  if (error) redirect(`/invitacion/${token}?error=${encodeURIComponent(error.message)}`)

  // La clínica a la que se sumó pasa a ser la activa
  ;(await cookies()).set(ACTIVE_CLINIC_COOKIE, clinicId as string, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 })
  redirect('/dashboard')
}
