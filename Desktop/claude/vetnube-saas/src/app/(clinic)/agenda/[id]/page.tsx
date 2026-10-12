import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileText, MessageCircle, Trash2 } from 'lucide-react'
import { AgendaRealtime } from '@/components/agenda/agenda-realtime'
import { AppointmentForm } from '@/components/agenda/appointment-form'
import { StatusActions } from '@/components/agenda/status-actions'
import { ConfirmSubmit } from '@/components/forms/buttons'
import { ErrorNotice } from '@/components/ui/notice'
import { PageHeader } from '@/components/ui/page-header'
import { PetAvatar } from '@/components/ui/pet-avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { APPOINTMENT_SELECT, agendaHref, localPosition, minutesToTime } from '@/lib/agenda'
import { requireClinic } from '@/lib/clinic'
import { formatDate, formatDateTime, fullName, whatsappLink } from '@/lib/format'
import { APPOINTMENT_TYPE } from '@/lib/labels'
import { canDelete } from '@/lib/permissions'
import { loadPetOptions } from '@/lib/pets'
import { getVets } from '@/lib/staff'
import type { AgendaAppointment } from '@/lib/types'
import { deleteAppointment, saveAppointment } from '../actions'

export const metadata: Metadata = { title: 'Turno' }

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }

type Stamps = { confirmed_at: string | null; checked_in_at: string | null; attended_at: string | null; cancelled_at: string | null; created_at: string }

export default async function TurnoPage({ params, searchParams }: Props) {
  const [{ id }, { error }] = await Promise.all([params, searchParams])
  const { supabase, clinic } = await requireClinic()
  const tz = clinic.timezone

  const { data } = await supabase
    .from('appointments')
    .select(`${APPOINTMENT_SELECT}, confirmed_at, checked_in_at, attended_at, cancelled_at, created_at`)
    .eq('id', id)
    .eq('clinic_id', clinic.id)
    .maybeSingle()
  if (!data) notFound()
  const a = data as unknown as AgendaAppointment & Stamps

  const [pets, vets, { data: record }] = await Promise.all([
    loadPetOptions(supabase, clinic.id),
    getVets(supabase, clinic.id),
    supabase.from('medical_records').select('id').eq('appointment_id', id).limit(1).maybeSingle(),
  ])

  const start = localPosition(a.starts_at, tz)
  const end = localPosition(a.ends_at, tz)
  const duration = Math.round((Date.parse(a.ends_at) - Date.parse(a.starts_at)) / 60_000)
  const dayHref = agendaHref({ vista: 'dia', fecha: start.day })
  const selfHref = `/agenda/${id}`
  const client = a.pet?.client
  const wa = whatsappLink(
    client?.phone,
    `Hola ${client?.first_name ?? ''}, te escribimos de ${clinic.name}. Te recordamos el turno de ${a.pet?.name ?? 'tu mascota'} el ${formatDate(start.day)} a las ${minutesToTime(start.minutes)}. ¿Nos confirmás si podés venir?`,
  )

  const timeline = [
    ['Agendado', a.created_at],
    ['Confirmado', a.confirmed_at],
    ['Llegó', a.checked_in_at],
    ['Atendido', a.attended_at],
    ['Cancelado', a.cancelled_at],
  ].filter(([, at]) => at) as [string, string][]

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <AgendaRealtime clinicId={clinic.id} />
      <PageHeader title="Turno" back={{ href: dayHref, label: 'Agenda del día' }} />
      <ErrorNotice message={error} />

      <section className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <PetAvatar name={a.pet?.name ?? '?'} species={a.pet?.species ?? 'otro'} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {a.pet ? (
                <Link href={`/pacientes/${a.pet.id}`} className="font-display text-xl font-bold hover:text-brand-600">
                  {a.pet.name}
                </Link>
              ) : (
                <span className="font-display text-xl font-bold">Paciente eliminado</span>
              )}
              <StatusBadge status={a.status} />
            </div>
            <p className="text-sm text-muted">
              {formatDate(start.day)} · {minutesToTime(start.minutes)} a {minutesToTime(end.minutes)} ({duration} min) ·{' '}
              {APPOINTMENT_TYPE[a.type]}
              {a.vet?.full_name && ` · ${a.vet.full_name}`}
            </p>
            {a.reason && <p className="mt-1 font-semibold">{a.reason}</p>}
            {client && (
              <p className="mt-1 text-sm">
                Tutor:{' '}
                <Link href={`/clientes/${client.id}`} className="font-bold text-brand-600 hover:underline">
                  {fullName(client)}
                </Link>
                {client.phone && <span className="text-muted"> · {client.phone}</span>}
              </p>
            )}
          </div>
          {wa && (a.status === 'pendiente' || a.status === 'confirmado') && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
            >
              <MessageCircle className="size-4" aria-hidden />
              Pedir confirmación
            </a>
          )}
        </div>

        <StatusActions appointment={a} returnTo={selfHref} />

        {record && a.pet && (
          <Link
            href={`/pacientes/${a.pet.id}?tab=historia`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:underline"
          >
            <FileText className="size-4" aria-hidden />
            Ver la consulta registrada en este turno
          </Link>
        )}

        {timeline.length > 1 && (
          <ol className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-xs text-muted">
            {timeline.map(([label, at]) => (
              <li key={label}>
                <b className="text-fg">{label}</b> {formatDateTime(at, tz)}
              </li>
            ))}
          </ol>
        )}
      </section>

      <h2 className="font-display text-lg font-bold">Editar o reprogramar</h2>
      <AppointmentForm
        action={saveAppointment.bind(null, id)}
        initial={{
          pet_id: a.pet?.id ?? '',
          type: a.type,
          status: a.status,
          date: start.day,
          time: minutesToTime(start.minutes),
          duration: String(duration),
          vet_id: a.vet_id ?? '',
          reason: a.reason,
          notes: a.notes,
        }}
        pets={pets}
        vets={vets}
        showStatus
        returnTo={selfHref}
        cancelHref={dayHref}
        submitLabel="Guardar cambios"
      />

      {canDelete(clinic.role) && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-white p-5">
          <div>
            <h2 className="font-display font-bold">Borrar turno</h2>
            <p className="text-sm text-muted">Usalo solo para turnos cargados por error. Si el cliente avisa que no viene, cancelalo.</p>
          </div>
          <form action={deleteAppointment.bind(null, id, dayHref)}>
            <ConfirmSubmit label={<><Trash2 className="size-4" aria-hidden /> Borrar</>} confirmLabel="Sí, borrar" />
          </form>
        </section>
      )}
    </div>
  )
}
