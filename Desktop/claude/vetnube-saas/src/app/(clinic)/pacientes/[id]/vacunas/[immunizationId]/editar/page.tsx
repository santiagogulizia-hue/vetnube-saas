import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ImmunizationForm } from '@/components/pets/immunization-form'
import { PageHeader } from '@/components/ui/page-header'
import { requireClinic } from '@/lib/clinic'
import { todayIn } from '@/lib/format'
import { getPetOr404 } from '@/lib/pets'
import { getVets } from '@/lib/staff'
import type { Immunization } from '@/lib/types'
import { saveImmunization } from '../../../clinical-actions'

export const metadata: Metadata = { title: 'Editar vacuna' }

type Props = { params: Promise<{ id: string; immunizationId: string }> }

export default async function EditarVacunaPage({ params }: Props) {
  const { id, immunizationId } = await params
  const { supabase, clinic } = await requireClinic()
  const [pet, vets, { data }] = await Promise.all([
    getPetOr404(supabase, clinic.id, id),
    getVets(supabase, clinic.id),
    supabase.from('immunizations').select('*').eq('id', immunizationId).eq('pet_id', id).eq('clinic_id', clinic.id).maybeSingle(),
  ])
  if (!data) notFound()
  const back = `/pacientes/${id}?tab=vacunas`

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={`Editar aplicación · ${pet.name}`} back={{ href: back, label: `Vacunas de ${pet.name}` }} />
      <ImmunizationForm
        action={saveImmunization.bind(null, id, immunizationId)}
        initial={data as Immunization}
        vets={vets}
        species={pet.species}
        today={todayIn(clinic.timezone)}
        cancelHref={back}
        submitLabel="Guardar cambios"
      />
    </div>
  )
}
