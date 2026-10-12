import type { Metadata } from 'next'
import { AppointmentForm } from '@/components/agenda/appointment-form'
import { PageHeader } from '@/components/ui/page-header'
import { agendaHref, isDay } from '@/lib/agenda'
import { requireClinic } from '@/lib/clinic'
import { toLocalInput, todayIn } from '@/lib/format'
import { loadPetOptions } from '@/lib/pets'
import { getVets } from '@/lib/staff'
import { saveAppointment } from '../actions'

export const metadata: Metadata = { title: 'Nuevo turno' }

type Props = { searchParams: Promise<{ fecha?: string; hora?: string; vet?: string; paciente?: string }> }

/** Próximo horario redondo (cada 30 min) a partir de ahora, en la zona de la clínica. */
function nextSlot(timeZone: string) {
  const local = toLocalInput(new Date(Date.now() + 30 * 60_000).toISOString(), timeZone)
  const [h, m] = local.slice(11, 16).split(':').map(Number)
  return m < 30 ? `${String(h).padStart(2, '0')}:30` : `${String((h + 1) % 24).padStart(2, '0')}:00`
}

export default async function NuevoTurnoPage({ searchParams }: Props) {
  const sp = await searchParams
  const { supabase, clinic, user } = await requireClinic()
  const [pets, vets] = await Promise.all([loadPetOptions(supabase, clinic.id), getVets(supabase, clinic.id)])

  const date = isDay(sp.fecha) ? sp.fecha : todayIn(clinic.timezone)
  const time = sp.hora && /^\d{2}:\d{2}$/.test(sp.hora) ? sp.hora : nextSlot(clinic.timezone)
  const vetId = vets.some((v) => v.id === sp.vet) ? sp.vet : vets.some((v) => v.id === user.id) ? user.id : ''
  const back = agendaHref({ vista: 'dia', fecha: date })

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Nuevo turno" back={{ href: back, label: 'Agenda' }} />
      <AppointmentForm
        action={saveAppointment.bind(null, null)}
        initial={{ pet_id: sp.paciente ?? '', type: 'consulta', date, time, duration: '30', vet_id: vetId }}
        pets={pets}
        vets={vets}
        returnTo={back}
        cancelHref={back}
        submitLabel="Agendar turno"
      />
    </div>
  )
}
