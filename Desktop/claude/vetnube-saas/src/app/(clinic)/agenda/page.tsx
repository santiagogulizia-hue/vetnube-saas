import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarPlus } from 'lucide-react'
import { AgendaControls } from '@/components/agenda/agenda-controls'
import { AgendaRealtime } from '@/components/agenda/agenda-realtime'
import { MonthView } from '@/components/agenda/month-view'
import { type GridColumn, TimeGrid } from '@/components/agenda/time-grid'
import { WaitingRoom } from '@/components/agenda/waiting-room'
import { primaryButton } from '@/components/forms/fields'
import { ErrorNotice } from '@/components/ui/notice'
import {
  APPOINTMENT_SELECT,
  agendaHours,
  agendaHref,
  dayHeader,
  isDay,
  isView,
  localPosition,
  newAppointmentHref,
  periodTitle,
  shiftDate,
  utcRange,
  visibleDays,
} from '@/lib/agenda'
import { requireClinic } from '@/lib/clinic'
import { todayIn } from '@/lib/format'
import { APPOINTMENT_TYPE, APPOINTMENT_TYPE_STYLE, options } from '@/lib/labels'
import { getVets } from '@/lib/staff'
import type { AgendaAppointment } from '@/lib/types'

export const metadata: Metadata = { title: 'Agenda' }

type Props = { searchParams: Promise<{ vista?: string; fecha?: string; vet?: string; error?: string }> }

export default async function AgendaPage({ searchParams }: Props) {
  const sp = await searchParams
  const { supabase, clinic } = await requireClinic()
  const tz = clinic.timezone
  const today = todayIn(tz)
  const view = isView(sp.vista) ? sp.vista : 'dia'
  const day = isDay(sp.fecha) ? sp.fecha : today

  const vets = await getVets(supabase, clinic.id)
  const vet = vets.some((v) => v.id === sp.vet) ? sp.vet : undefined

  const days = visibleDays(view, day)
  const { from, to } = utcRange(days, tz)
  let query = supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('clinic_id', clinic.id)
    .gte('starts_at', from.toISOString())
    .lt('starts_at', to.toISOString())
    .order('starts_at')
  if (vet) query = query.eq('vet_id', vet)
  const { data, error } = await query
  if (error) throw new Error(error.message)

  const all = (data ?? []) as unknown as AgendaAppointment[]
  const active = all.filter((a) => a.status !== 'cancelado')
  const cancelled = all.filter((a) => a.status === 'cancelado')
  const hours = agendaHours(clinic.settings)
  const nowMinutes = days.includes(today) ? localPosition(new Date().toISOString(), tz).minutes : null
  const returnTo = agendaHref({ vista: view, fecha: day, vet })

  let content: React.ReactNode
  if (view === 'mes') {
    content = <MonthView days={days} month={day.slice(0, 7)} today={today} appointments={active} timeZone={tz} vet={vet} />
  } else if (view === 'semana') {
    const columns: GridColumn[] = days.map((d) => {
      const h = dayHeader(d)
      return {
        key: d,
        day: d,
        vetId: vet,
        isToday: d === today,
        header: (
          <Link href={agendaHref({ vista: 'dia', fecha: d, vet })} className="block hover:text-brand-600">
            <span className="text-xs font-bold text-muted uppercase">{h.weekday}</span>{' '}
            <span className={`font-display text-lg font-bold ${d === today ? 'text-brand-600' : ''}`}>{h.number}</span>
          </Link>
        ),
        appointments: active.filter((a) => localPosition(a.starts_at, tz).day === d),
      }
    })
    content = <TimeGrid columns={columns} hours={hours} timeZone={tz} nowMinutes={nowMinutes} />
  } else {
    content = (
      <DayView
        day={day}
        today={today}
        appointments={active}
        cancelled={cancelled}
        vets={vet ? vets.filter((v) => v.id === vet) : vets}
        hours={hours}
        timeZone={tz}
        nowMinutes={nowMinutes}
        returnTo={returnTo}
      />
    )
  }

  return (
    <div className="space-y-4">
      <AgendaRealtime clinicId={clinic.id} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Referencias de tipo de turno">
          {options(APPOINTMENT_TYPE).map(([key, label]) => (
            <li key={key} className="inline-flex items-center gap-1.5">
              <span className={`size-2.5 rounded-full ${APPOINTMENT_TYPE_STYLE[key].dot}`} aria-hidden />
              {label}
            </li>
          ))}
        </ul>
        <Link href={newAppointmentHref({ fecha: day < today ? today : day, vet })} className={primaryButton}>
          <CalendarPlus className="size-4" aria-hidden />
          Nuevo turno
        </Link>
      </div>

      <AgendaControls
        view={view}
        day={day}
        prevDay={shiftDate(view, day, -1)}
        nextDay={shiftDate(view, day, 1)}
        today={today}
        title={periodTitle(view, day)}
        vet={vet}
        vets={vets}
      />

      <ErrorNotice message={sp.error} />
      {content}
    </div>
  )
}

type DayViewProps = {
  day: string
  today: string
  appointments: AgendaAppointment[]
  cancelled: AgendaAppointment[]
  vets: { id: string; name: string }[]
  hours: ReturnType<typeof agendaHours>
  timeZone: string
  nowMinutes: number | null
  returnTo: string
}

/** Vista de día: una columna por profesional (como en el consultorio) y, si es hoy, la sala de espera. */
function DayView({ day, today, appointments, cancelled, vets, hours, timeZone, nowMinutes, returnTo }: DayViewProps) {
  const known = new Set(vets.map((v) => v.id))
  // Turnos asignados a alguien que ya no figura como profesional
  const extra = new Map<string, string>()
  for (const a of appointments) {
    if (a.vet_id && !known.has(a.vet_id)) extra.set(a.vet_id, a.vet?.full_name || 'Otro profesional')
  }
  const unassigned = appointments.filter((a) => !a.vet_id)

  const columns: GridColumn[] = [
    ...vets.map((v) => ({ id: v.id, name: v.name })),
    ...[...extra].map(([id, name]) => ({ id, name })),
  ].map((v) => ({
    key: v.id,
    day,
    vetId: v.id,
    isToday: false,
    header: <span className="font-bold">{v.name}</span>,
    appointments: appointments.filter((a) => a.vet_id === v.id),
  }))
  if (unassigned.length || columns.length === 0) {
    columns.push({
      key: 'sin-asignar',
      day,
      vetId: null,
      isToday: false,
      header: <span className="font-bold text-muted">{columns.length ? 'Sin asignar' : 'Turnos'}</span>,
      appointments: unassigned,
    })
  }
  columns.forEach((c) => (c.isToday = day === today))

  const grid = (
    <div className="space-y-3">
      <TimeGrid columns={columns} hours={hours} timeZone={timeZone} nowMinutes={nowMinutes} />
      {cancelled.length > 0 && (
        <p className="text-sm text-muted">
          {cancelled.length} {cancelled.length === 1 ? 'turno cancelado' : 'turnos cancelados'}:{' '}
          {cancelled.map((a, i) => (
            <span key={a.id}>
              {i > 0 && ', '}
              <Link href={`/agenda/${a.id}`} className="font-semibold line-through hover:text-brand-600">
                {a.pet?.name}
              </Link>
            </span>
          ))}
        </p>
      )}
    </div>
  )

  if (day !== today) return grid
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      {grid}
      <WaitingRoom appointments={appointments} timeZone={timeZone} returnTo={returnTo} />
    </div>
  )
}
