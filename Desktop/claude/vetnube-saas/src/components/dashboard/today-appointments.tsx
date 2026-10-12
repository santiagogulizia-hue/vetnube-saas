import Link from 'next/link'
import { CalendarX2, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PetAvatar } from '@/components/ui/pet-avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatTime } from '@/lib/format'
import { APPOINTMENT_TYPE } from '@/lib/labels'
import type { TodayAppointment } from '@/lib/types'

type Props = { appointments: TodayAppointment[]; timeZone: string; waiting: number }

export function TodayAppointments({ appointments, timeZone, waiting }: Props) {
  return (
    <Card
      title="Agenda de hoy"
      action={
        <Link href="/agenda" className="text-sm font-bold text-brand-600 hover:underline">
          Ver agenda
        </Link>
      }
    >
      {waiting > 0 && (
        <p className="mb-3 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
          <Clock className="size-4" aria-hidden />
          {waiting} {waiting === 1 ? 'paciente en sala de espera' : 'pacientes en sala de espera'}
        </p>
      )}

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <CalendarX2 className="size-8 text-ink-400" aria-hidden />
          <p className="font-semibold">No hay turnos para hoy</p>
          <Link href="/agenda/nuevo" className="text-sm font-bold text-brand-600 hover:underline">
            Agendar un turno
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {appointments.map((a) => {
            const client = a.pet?.client
            const tutor = client ? `${client.first_name} ${client.last_name}`.trim() : null
            const dimmed = a.status === 'cancelado' || a.status === 'ausente'
            return (
              <li key={a.id} className={`flex items-center gap-3 py-3 ${dimmed ? 'opacity-50' : ''}`}>
                <span className="w-12 shrink-0 font-bold tabular-nums">{formatTime(a.starts_at, timeZone)}</span>
                <PetAvatar name={a.pet?.name ?? '?'} species={a.pet?.species ?? 'otro'} />
                <div className="min-w-0 flex-1">
                  <Link href={`/agenda/${a.id}`} className="block truncate font-bold hover:text-brand-600">
                    {a.pet?.name ?? 'Paciente eliminado'}
                  </Link>
                  <p className="truncate text-sm text-muted">
                    {[APPOINTMENT_TYPE[a.type], a.reason, tutor, a.vet?.full_name].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
