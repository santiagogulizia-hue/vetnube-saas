import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { PetAvatar } from '@/components/ui/pet-avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { localPosition, minutesToTime } from '@/lib/agenda'
import { fullName } from '@/lib/format'
import type { AgendaAppointment } from '@/lib/types'
import { StatusActions } from './status-actions'

type Props = { appointments: AgendaAppointment[]; timeZone: string; returnTo: string }

/** Panel del día: quién está en sala, en consultorio y quién falta llegar. */
export function WaitingRoom({ appointments, timeZone, returnTo }: Props) {
  const inClinic = appointments.filter((a) => a.status === 'en_espera' || a.status === 'en_atencion')
  const expected = appointments.filter((a) => a.status === 'pendiente' || a.status === 'confirmado')

  const row = (a: AgendaAppointment) => (
    <li key={a.id} className="space-y-2 py-3">
      <div className="flex items-center gap-3">
        <PetAvatar name={a.pet?.name ?? '?'} species={a.pet?.species ?? 'otro'} />
        <div className="min-w-0 flex-1">
          <Link href={`/agenda/${a.id}`} className="block truncate font-bold hover:text-brand-600">
            {a.pet?.name ?? 'Paciente eliminado'}
          </Link>
          <p className="truncate text-xs text-muted">
            {minutesToTime(localPosition(a.starts_at, timeZone).minutes)} · {fullName(a.pet?.client)}
          </p>
        </div>
        <StatusBadge status={a.status} />
      </div>
      <StatusActions appointment={a} returnTo={returnTo} variant="compact" />
    </li>
  )

  return (
    <div className="space-y-5">
      <Card title={`Sala de espera (${inClinic.length})`}>
        {inClinic.length === 0 ? (
          <p className="py-2 text-sm text-muted">Nadie esperando. Marcá «Llegó» cuando ingrese un paciente.</p>
        ) : (
          <ul className="divide-y divide-line">{inClinic.map(row)}</ul>
        )}
      </Card>
      <Card title={`Por llegar (${expected.length})`}>
        {expected.length === 0 ? (
          <p className="py-2 text-sm text-muted">No quedan turnos pendientes hoy.</p>
        ) : (
          <ul className="divide-y divide-line">{expected.map(row)}</ul>
        )}
      </Card>
    </div>
  )
}
