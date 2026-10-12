import Link from 'next/link'
import { CheckCircle2, DoorOpen, Stethoscope, ThumbsUp, UserX, XCircle } from 'lucide-react'
import { setAppointmentStatus, startAttention } from '@/app/(clinic)/agenda/actions'
import type { AgendaAppointment, AppointmentStatus } from '@/lib/types'

type Props = {
  appointment: Pick<AgendaAppointment, 'id' | 'status' | 'pet'>
  returnTo: string
  /** compact: solo la acción principal (sala de espera); full: todas (detalle del turno) */
  variant?: 'compact' | 'full'
}

const btn =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 focus-visible:outline-2'
const tone = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  neutral: 'border border-line bg-white text-fg hover:border-brand-500',
  danger: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
}

function StatusButton({ id, status, returnTo, label, icon: Icon, variant }: {
  id: string
  status: AppointmentStatus
  returnTo: string
  label: string
  icon: typeof ThumbsUp
  variant: keyof typeof tone
}) {
  return (
    <form action={setAppointmentStatus.bind(null, id, status, returnTo)}>
      <button className={`${btn} ${tone[variant]}`}>
        <Icon className="size-3.5" aria-hidden />
        {label}
      </button>
    </form>
  )
}

/** Botones del flujo del turno: confirmar → llegó → atender → atendido. */
export function StatusActions({ appointment: a, returnTo, variant = 'full' }: Props) {
  const full = variant === 'full'
  const s = a.status

  return (
    <div className="flex flex-wrap gap-2">
      {s === 'pendiente' && <StatusButton id={a.id} status="confirmado" returnTo={returnTo} label="Confirmar" icon={ThumbsUp} variant={full ? 'neutral' : 'primary'} />}
      {(s === 'pendiente' || s === 'confirmado') && (
        <StatusButton id={a.id} status="en_espera" returnTo={returnTo} label="Llegó" icon={DoorOpen} variant={full || s === 'confirmado' ? 'primary' : 'neutral'} />
      )}
      {s === 'en_espera' && (
        <form action={startAttention.bind(null, a.id, returnTo)}>
          <button className={`${btn} ${tone.primary}`}>
            <Stethoscope className="size-3.5" aria-hidden />
            Atender
          </button>
        </form>
      )}
      {s === 'en_atencion' && a.pet && (
        <Link href={`/pacientes/${a.pet.id}/consultas/nueva?turno=${a.id}`} className={`${btn} ${tone.primary}`}>
          <Stethoscope className="size-3.5" aria-hidden />
          Cargar consulta
        </Link>
      )}
      {s === 'en_atencion' && (
        <StatusButton id={a.id} status="atendido" returnTo={returnTo} label="Atendido" icon={CheckCircle2} variant="neutral" />
      )}
      {full && (s === 'pendiente' || s === 'confirmado') && (
        <>
          <StatusButton id={a.id} status="ausente" returnTo={returnTo} label="No vino" icon={UserX} variant="danger" />
          <StatusButton id={a.id} status="cancelado" returnTo={returnTo} label="Cancelar turno" icon={XCircle} variant="danger" />
        </>
      )}
      {full && (s === 'cancelado' || s === 'ausente') && (
        <StatusButton id={a.id} status="pendiente" returnTo={returnTo} label="Reactivar turno" icon={ThumbsUp} variant="neutral" />
      )}
    </div>
  )
}
