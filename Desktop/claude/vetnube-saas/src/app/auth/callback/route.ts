import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/format'

/** Destino del link de confirmación de email que envía Supabase. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  const message = encodeURIComponent('El link de confirmación no es válido o ya venció. Ingresá de nuevo.')
  return NextResponse.redirect(`${origin}/login?error=${message}`)
}
