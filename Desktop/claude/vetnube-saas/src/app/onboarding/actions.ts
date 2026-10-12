'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createClinic(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const timezone = String(formData.get('timezone') ?? 'America/Argentina/Buenos_Aires')

  if (!name) redirect(`/onboarding?error=${encodeURIComponent('Escribí el nombre de la clínica.')}`)

  const supabase = await createClient()
  const { error } = await supabase.rpc('create_clinic', { p_name: name, p_timezone: timezone })
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`)

  redirect('/dashboard')
}
