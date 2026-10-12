import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { ClinicalAlerts } from '@/components/pets/clinical-alerts'
import { MedicalRecordForm } from '@/components/pets/medical-record-form'
import { PageHeader } from '@/components/ui/page-header'
import { requireClinic } from '@/lib/clinic'
import { toLocalInput } from '@/lib/format'
import { canWriteClinical } from '@/lib/permissions'
import { getPetOr404 } from '@/lib/pets'
import { getVets } from '@/lib/staff'
import type { MedicalRecord } from '@/lib/types'
import { saveMedicalRecord } from '../../../clinical-actions'

export const metadata: Metadata = { title: 'Editar consulta' }

type Props = { params: Promise<{ id: string; recordId: string }> }

export default async function EditarConsultaPage({ params }: Props) {
  const { id, recordId } = await params
  const { supabase, clinic } = await requireClinic()
  const back = `/pacientes/${id}?tab=historia`
  if (!canWriteClinical(clinic.role)) redirect(`${back}&error=${encodeURIComponent('Tu rol no puede editar consultas.')}`)

  const [pet, vets, { data }] = await Promise.all([
    getPetOr404(supabase, clinic.id, id),
    getVets(supabase, clinic.id),
    supabase.from('medical_records').select('*').eq('id', recordId).eq('pet_id', id).eq('clinic_id', clinic.id).maybeSingle(),
  ])
  if (!data) notFound()
  const record = data as MedicalRecord

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title={`Editar consulta · ${pet.name}`} back={{ href: back, label: `Historia de ${pet.name}` }} />
      <ClinicalAlerts allergies={pet.allergies} chronic={pet.chronic_conditions} />
      <MedicalRecordForm
        action={saveMedicalRecord.bind(null, id, recordId)}
        initial={{ ...record, visit_at: toLocalInput(record.visit_at, clinic.timezone) }}
        vets={vets}
        cancelHref={back}
        submitLabel="Guardar cambios"
      />
    </div>
  )
}
