import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ClientForm } from '@/components/clients/client-form'
import { ConfirmSubmit } from '@/components/forms/buttons'
import { ErrorNotice } from '@/components/ui/notice'
import { PageHeader } from '@/components/ui/page-header'
import { requireClinic } from '@/lib/clinic'
import { fullName } from '@/lib/format'
import { canDelete } from '@/lib/permissions'
import type { Client } from '@/lib/types'
import { archiveClientRecord, updateClientRecord } from '../../actions'

export const metadata: Metadata = { title: 'Editar cliente' }

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }

export default async function EditarClientePage({ params, searchParams }: Props) {
  const [{ id }, { error }] = await Promise.all([params, searchParams])
  const { supabase, clinic } = await requireClinic()

  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('clinic_id', clinic.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!data) notFound()
  const client = data as Client

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={`Editar ${fullName(client)}`} back={{ href: `/clientes/${id}`, label: 'Ficha del cliente' }} />
      <ErrorNotice message={error} />
      <ClientForm
        action={updateClientRecord.bind(null, id)}
        client={client}
        cancelHref={`/clientes/${id}`}
        submitLabel="Guardar cambios"
      />

      {canDelete(clinic.role) && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-white p-5">
          <div>
            <h2 className="font-display font-bold">Dar de baja al cliente</h2>
            <p className="text-sm text-muted">Deja de aparecer en los listados. Sus ventas y la historia de sus mascotas se conservan.</p>
          </div>
          <form action={archiveClientRecord.bind(null, id)}>
            <ConfirmSubmit label="Dar de baja" confirmLabel="Sí, dar de baja" />
          </form>
        </section>
      )}
    </div>
  )
}
