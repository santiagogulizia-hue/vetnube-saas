import type { Metadata } from 'next'
import { ClientForm } from '@/components/clients/client-form'
import { PageHeader } from '@/components/ui/page-header'
import { createClientRecord } from '../actions'

export const metadata: Metadata = { title: 'Nuevo cliente' }

export default function NuevoClientePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Nuevo cliente" back={{ href: '/clientes', label: 'Clientes' }} />
      <ClientForm action={createClientRecord} cancelHref="/clientes" submitLabel="Guardar cliente" />
    </div>
  )
}
