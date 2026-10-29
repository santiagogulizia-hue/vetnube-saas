'use server'

import { randomBytes } from 'node:crypto'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

const back = (message: string) => redirect(`/arrepentimiento?error=${encodeURIComponent(message)}`)

// Sin 0/O ni 1/I para que el código se pueda dictar sin confusiones
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newCode = () => Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join('')

/**
 * Botón de arrepentimiento (Res. 424/2020): registra la solicitud y devuelve
 * un código de identificación. No hace falta tener sesión.
 */
export async function requestWithdrawal(formData: FormData) {
  const fullName = String(formData.get('full_name') ?? '').trim().slice(0, 120)
  const email = String(formData.get('email') ?? '').trim().toLowerCase().slice(0, 160)
  const clinicName = String(formData.get('clinic_name') ?? '').trim().slice(0, 120) || null
  const details = String(formData.get('details') ?? '').trim().slice(0, 1000) || null

  if (!fullName) back('Completá tu nombre y apellido.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back('Ingresá un email válido.')

  const code = newCode()
  const { error } = await createAdminClient()
    .from('withdrawal_requests')
    .insert({ code, full_name: fullName, email, clinic_name: clinicName, details })
  if (error) back('No pudimos registrar la solicitud. Probá de nuevo en unos minutos.')

  redirect(`/arrepentimiento?codigo=${code}`)
}
