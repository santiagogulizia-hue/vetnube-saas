'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const back = (message: string) => redirect(`/login/nueva-clave?error=${encodeURIComponent(message)}`)

/** Guarda la contraseña nueva. Requiere la sesión temporal que abre el link del email. */
export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  if (password.length < 8) back('La contraseña debe tener al menos 8 caracteres.')
  if (password !== confirm) back('Las dos contraseñas no coinciden.')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login/recuperar?error=${encodeURIComponent('El link venció o ya se usó. Pedí uno nuevo.')}`)

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    back(/different from the old|same password/i.test(error.message) ? 'La contraseña nueva tiene que ser distinta de la anterior.' : error.message)
  }

  redirect('/dashboard')
}
