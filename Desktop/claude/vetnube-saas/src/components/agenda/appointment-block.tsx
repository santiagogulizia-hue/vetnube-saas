import Link from 'next/link'
import { Check } from 'lucide-react'
import { fullName } from '@/lib/format'
import { APPOINTMENT_STATUS, APPOINTMENT_TYPE, APPOINTMENT_TYPE_STYLE } from '@/lib/labels'
import type { AgendaAppointment } from '@/lib/types'

const STATUS_RING: Partial<Record<AgendaAppointment['status'], string>> = {
  en_espera: 'ring-2 ring-amber-400',
  en_atencion: 'ring-2 ring-violet-500',
}

type Props = {
  appointment: AgendaAppointment
  timeLabel: string
  style?: React.CSSProperties
  compact?: boolean
}

/** Bloque de un turno dentro de la grilla horaria. */
export function AppointmentBlock({ appointment: a, timeLabel, style, compact }: Props) {
  const type = APPOINTMENT_TYPE_STYLE[a.type]
  const off = a.status === 'cancelado' || a.status === 'ausente'
  const done = a.status === 'atendido'
  const tutor = fullName(a.pet?.client)

  return (
    <Link
      href={`/agenda/${a.id}`}
      style={style}
      title={`${timeLabel} · ${a.pet?.name ?? 'Paciente'} · ${APPOINTMENT_TYPE[a.type]} · ${APPOINTMENT_STATUS[a.status].label}`}
      className={`absolute z-10 overflow-hidden rounded-md border-l-4 px-2 py-1 text-xs leading-tight shadow-sm transition-shadow hover:z-20 hover:shadow-md ${type.block} ${
        STATUS_RING[a.status] ?? ''
      } ${off ? 'line-through opacity-50' : ''} ${done ? 'opacity-70' : ''}`}
    >
      <p className="flex items-center gap-1 font-bold">
        <span className="tabular-nums">{timeLabel}</span>
        <span className="truncate">{a.pet?.name ?? 'Paciente eliminado'}</span>
        {done && <Check className="size-3.5 shrink-0" aria-label="Atendido" />}
      </p>
      {!compact && (
        <p className="truncate opacity-80">
          {[a.reason || APPOINTMENT_TYPE[a.type], tutor].filter(Boolean).join(' · ')}
        </p>
      )}
    </Link>
  )
}
