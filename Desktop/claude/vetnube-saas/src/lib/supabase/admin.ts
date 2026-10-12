import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente con la service_role key: saltea RLS. Usarlo SOLO en el servidor y
 * solo para lo que un usuario no puede hacer por sí mismo (por ejemplo,
 * actualizar el estado de la suscripción desde el webhook de Mercado Pago).
 * `server-only` hace fallar el build si alguien lo importa desde el navegador.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en .env.local (Supabase → Project Settings → API → service_role).')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
