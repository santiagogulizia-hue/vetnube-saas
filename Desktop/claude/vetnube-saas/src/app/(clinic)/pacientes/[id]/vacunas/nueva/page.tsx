import type { Metadata } from 'next'
import { ImmunizationForm } from '@/components/pets/immunization-form'
import { PageHeader } from '@/components/ui/page-header'
import { requireClinic } from '@/lib/clinic'
import { todayIn } from '@/lib/format'
import { getPetOr404 } from '@/lib/pets'
import { getVets } from '@/lib/staff'
import { saveImmunization } from '../../clinical-actions'

export const metadata: Metadata = { title: 'Registrar vacuna' }

export default async function NuevaVacunaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, clinic, user } = await requireClinic()
  const [pet, vets] = await Promise.all([getPetOr404(supabase, clinic.id, id), getVets(supabase, clinic.id)])
  const today = todayIn(clinic.timezone)
  const back = `/pacientes/${id}?tab=vacunas`

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title={`Vacuna o desparasitación · ${pet.name}`}
        description="Si cargás la próxima dosis, el recordatorio aparece en el inicio cuando falten 7 días."
        back={{ href: back, label: `Vacunas de ${pet.name}` }}
      />
      <ImmunizationForm
        action={saveImmunization.bind(null, id, null)}
        initial={{ kind: 'vacuna', applied_on: today, vet_id: vets.some((v) => v.id === user.id) ? user.id : '' }}
        vets={vets}
        species={pet.species}
        today={today}
        cancelHref={back}
        submitLabel="Guardar"
      />
    </div>
  )
}
