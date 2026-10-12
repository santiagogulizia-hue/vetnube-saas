import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ConfirmSubmit } from '@/components/forms/buttons'
import { PetForm } from '@/components/pets/pet-form'
import { ErrorNotice } from '@/components/ui/notice'
import { PageHeader } from '@/components/ui/page-header'
import { requireClinic } from '@/lib/clinic'
import { fullName, todayIn } from '@/lib/format'
import { canDelete } from '@/lib/permissions'
import type { Pet } from '@/lib/types'
import { archivePet, updatePet } from '../../actions'

export const metadata: Metadata = { title: 'Editar paciente' }

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }

export default async function EditarPacientePage({ params, searchParams }: Props) {
  const [{ id }, { error }] = await Promise.all([params, searchParams])
  const { supabase, clinic } = await requireClinic()

  const [{ data: petData }, { data: clientsData }] = await Promise.all([
    supabase.from('pets').select('*').eq('id', id).eq('clinic_id', clinic.id).is('deleted_at', null).maybeSingle(),
    supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('clinic_id', clinic.id)
      .is('deleted_at', null)
      .order('last_name')
      .limit(1000),
  ])
  if (!petData) notFound()
  const pet = petData as Pet
  const clients = (clientsData ?? []).map((c) => ({ id: c.id as string, name: fullName(c as { first_name: string; last_name: string }) }))

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={`Editar a ${pet.name}`} back={{ href: `/pacientes/${id}`, label: 'Ficha del paciente' }} />
      <ErrorNotice message={error} />
      <PetForm
        action={updatePet.bind(null, id)}
        pet={pet}
        clients={clients}
        cancelHref={`/pacientes/${id}`}
        submitLabel="Guardar cambios"
        today={todayIn(clinic.timezone)}
      />

      {canDelete(clinic.role) && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-white p-5">
          <div>
            <h2 className="font-display font-bold">Dar de baja al paciente</h2>
            <p className="text-sm text-muted">
              Deja de aparecer en los listados. Si falleció, usá «Registrar fallecimiento»: conserva la ficha visible.
            </p>
          </div>
          <form action={archivePet.bind(null, id)}>
            <ConfirmSubmit label="Dar de baja" confirmLabel="Sí, dar de baja" />
          </form>
        </section>
      )}
    </div>
  )
}
