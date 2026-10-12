import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CalendarCheck } from 'lucide-react'
import { ClinicalAlerts } from '@/components/pets/clinical-alerts'
import { MedicalRecordForm } from '@/components/pets/medical-record-form'
import { PageHeader } from '@/components/ui/page-header'
import { localPosition, minutesToTime } from '@/lib/agenda'
import { requireClinic } from '@/lib/clinic'
import { toLocalInput } from '@/lib/format'
import { APPOINTMENT_TYPE } from '@/lib/labels'
import { canWriteClinical } from '@/lib/permissions'
import { getPetOr404 } from '@/lib/pets'
import { getVets } from '@/lib/staff'
import type { AppointmentType } from '@/lib/types'
import { saveMedicalRecord } from '../../clinical-actions'

export const metadata: Metadata = { title: 'Nueva consulta' }

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ turno?: string }> }
type LinkedAppointment = { id: string; starts_at: string; type: AppointmentType; reason: string | null; vet_id: string | null }

export default async function NuevaConsultaPage({ params, searchParams }: Props) {
  const [{ id }, { turno }] = await Promise.all([params, searchParams])
  const { supabase, clinic, user } = await requireClinic()
  if (!canWriteClinical(clinic.role)) {
    redirect(`/pacientes/${id}?tab=historia&error=${encodeURIComponent('Tu rol no puede cargar consultas.')}`)
  }

  const [pet, vets, { data: apptData }] = await Promise.all([
    getPetOr404(supabase, clinic.id, id),
    getVets(supabase, clinic.id),
    turno
      ? supabase
          .from('appointments')
          .select('id, starts_at, type, reason, vet_id')
          .eq('id', turno)
          .eq('pet_id', id)
          .eq('clinic_id', clinic.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const appointment = apptData as LinkedAppointment | null
  const back = appointment ? `/agenda/${appointment.id}` : `/pacientes/${id}?tab=historia`
  const defaultVet = appointment?.vet_id ?? (vets.some((v) => v.id === user.id) ? user.id : '')

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title={`Nueva consulta · ${pet.name}`}
        back={appointment ? { href: back, label: 'Turno' } : { href: back, label: `Historia de ${pet.name}` }}
      />
      {appointment && (
        <p className="flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 ring-1 ring-brand-200">
          <CalendarCheck className="size-4 shrink-0" aria-hidden />
          Turno de las {minutesToTime(localPosition(appointment.starts_at, clinic.timezone).minutes)}. Al guardar, el turno queda
          como atendido.
        </p>
      )}
      <ClinicalAlerts allergies={pet.allergies} chronic={pet.chronic_conditions} />
      <MedicalRecordForm
        action={saveMedicalRecord.bind(null, id, null)}
        initial={{
          visit_at: toLocalInput(new Date().toISOString(), clinic.timezone),
          record_type: appointment?.type === 'control' ? 'control' : appointment?.type === 'cirugia' ? 'cirugia' : 'consulta',
          vet_id: defaultVet,
          reason: appointment ? appointment.reason || APPOINTMENT_TYPE[appointment.type] : '',
        }}
        hidden={appointment ? { appointment_id: appointment.id } : {}}
        vets={vets}
        cancelHref={back}
        submitLabel="Guardar consulta"
      />
    </div>
  )
}
