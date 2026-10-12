'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Escucha cambios en los turnos de la clínica (Supabase Realtime, habilitado en
 * la Fase 1) y refresca la pantalla: si recepción marca "Llegó", el consultorio
 * lo ve sin recargar. Las políticas RLS también filtran los eventos.
 */
export function AgendaRealtime({ clinicId }: { clinicId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), 400)
    }

    const channel = supabase
      .channel(`agenda-${clinicId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinicId}` }, refresh)
      .subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [clinicId, router])

  return null
}
