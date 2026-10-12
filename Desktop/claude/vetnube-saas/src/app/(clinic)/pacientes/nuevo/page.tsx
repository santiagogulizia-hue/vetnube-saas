import type { Metadata } from 'next'
import Link from 'next/link'
import { PetForm } from '@/components/pets/pet-form'
import { PageHeader } from '@/components/ui/page-header'
import { requireClinic } from '@/lib/clinic'
import { fullName, todayIn } from '@/lib/format'
import { createPet } from '../actions'

export const metadata: Metadata = { title: 'Nuevo paciente' }

export default async function NuevoPacientePage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams
  const { supabase, clinic } = await requireClinic()

  const { data } = await supabase
    .from('clients')
    .select('id, first_name, last_name')
    .eq('clinic_id', clinic.id)
    .is('deleted_at', null)
    .order('last_name')
    .order('first_name')
    .limit(1000)
  const clients = (data ?? []).map((c) => ({ id: c.id as string, name: fullName(c as { first_name: string; last_name: string }) }))
  const locked = cliente ? clients.find((c) => c.id === cliente) : undefined
  const back = locked ? { href: `/clientes/${locked.id}`, label: locked.name } : { href: '/pacientes', label: 'Pacientes' }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={locked ? `Nueva mascota de ${locked.name}` : 'Nuevo paciente'} back={back} />
      {clients.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-sm">
          Para registrar un paciente primero necesitás su tutor.{' '}
          <Link href="/clientes/nuevo" className="font-bold text-brand-600 hover:underline">
            Cargar cliente
          </Link>
        </p>
      ) : (
        <PetForm
          action={createPet}
          clients={clients}
          lockedClient={locked}
          cancelHref={back.href}
          submitLabel="Guardar paciente"
          today={todayIn(clinic.timezone)}
        />
      )}
    </div>
  )
}
