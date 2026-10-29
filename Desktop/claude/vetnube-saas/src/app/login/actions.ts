'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/format'

const AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'El email o la contraseña no son correctos.',
  'Email not confirmed': 'Todavía no confirmaste tu email. Revisá tu bandeja de entrada.',
  'User already registered': 'Ya existe una cuenta con ese email. Iniciá sesión.',
}

const translate = (message: string) => AUTH_ERRORS[message] ?? message

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = safeNext(formData.get('next'))

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect(`/login?error=${encodeURIComponent(translate(error.message))}`)

  redirect(next)
}

export async function signUp(formData: FormData) {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  // Si viene de un link de invitación, vuelve ahí; si no, al alta de la clínica
  const next = safeNext(formData.get('next'), '/onboarding')
  const keepNext = next !== '/onboarding' ? `&next=${encodeURIComponent(next)}` : ''

  if (formData.get('accept_terms') !== 'on') {
    redirect(`/login?modo=registro${keepNext}&error=${encodeURIComponent('Para crear la cuenta tenés que aceptar los términos y la política de privacidad.')}`)
  }
  if (password.length < 8) {
    redirect(`/login?modo=registro${keepNext}&error=${encodeURIComponent('La contraseña debe tener al menos 8 caracteres.')}`)
  }

  const origin = (await headers()).get('origin') ?? ''
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Constancia de la aceptación (queda en los metadatos del usuario)
      data: { full_name: fullName, terms_accepted_at: new Date().toISOString() },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })
  if (error) redirect(`/login?modo=registro${keepNext}&error=${encodeURIComponent(translate(error.message))}`)

  // Con "Confirm email" activo en Supabase no hay sesión hasta confirmar
  if (!data.session) {
    redirect(`/login?message=${encodeURIComponent('Te enviamos un email para confirmar tu cuenta.')}`)
  }
  redirect(next)
}
