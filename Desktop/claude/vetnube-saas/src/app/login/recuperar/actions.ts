'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Envía el email para restablecer la contraseña. Siempre responde lo mismo,
 * exista o no la cuenta, para no revelar qué emails están registrados.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(`/login/recuperar?error=${encodeURIComponent('Ingresá un email válido.')}`)
  }

  const origin = (await headers()).get('origin') ?? ''
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/login/nueva-clave`,
  })

  // Límite de envíos de Supabase: es el único error que vale la pena mostrar
  if (error && /rate limit|security purposes|too many/i.test(error.message)) {
    redirect(`/login/recuperar?error=${encodeURIComponent('Ya pediste un email hace muy poco. Esperá unos minutos y volvé a intentar.')}`)
  }

  redirect('/login/recuperar?enviado=1')
}
