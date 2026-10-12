import Link from 'next/link'
import { agendaHref, dayHeader, localPosition, minutesToTime, newAppointmentHref } from '@/lib/agenda'
import { APPOINTMENT_TYPE_STYLE } from '@/lib/labels'
import type { AgendaAppointment } from '@/lib/types'

type Props = {
  days: string[]
  month: string // YYYY-MM
  today: string
  appointments: AgendaAppointment[]
  timeZone: string
  vet?: string
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MAX_PER_DAY = 3

export function MonthView({ days, month, today, appointments, timeZone, vet }: Props) {
  const byDay = new Map<string, { a: AgendaAppointment; time: string }[]>()
  for (const a of appointments) {
    const pos = localPosition(a.starts_at, timeZone)
    const list = byDay.get(pos.day) ?? []
    list.push({ a, time: minutesToTime(pos.minutes) })
    byDay.set(pos.day, list)
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
      <div className="grid min-w-[44rem] grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div key={d} className="border-b border-line py-2 text-center text-xs font-bold tracking-wider text-muted uppercase">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          const items = byDay.get(day) ?? []
          const outside = !day.startsWith(month)
          const isToday = day === today
          return (
            <div
              key={day}
              className={`group relative min-h-28 border-line p-1.5 ${i % 7 ? 'border-l' : ''} ${i >= 7 ? 'border-t' : ''} ${
                outside ? 'bg-canvas/60' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <Link
                  href={agendaHref({ vista: 'dia', fecha: day, vet })}
                  className={`grid size-7 place-items-center rounded-full text-sm font-bold hover:bg-brand-50 ${
                    isToday ? 'bg-brand-600 text-white hover:bg-brand-700' : outside ? 'text-ink-400' : ''
                  }`}
                  aria-label={`Ver el día ${day}`}
                >
                  {dayHeader(day).number}
                </Link>
                <Link
                  href={newAppointmentHref({ fecha: day, vet })}
                  className="hidden rounded px-1.5 text-xs font-bold text-brand-600 group-hover:block hover:bg-brand-50"
                  aria-label={`Nuevo turno el ${day}`}
                >
                  +
                </Link>
              </div>
              <ul className="mt-1 space-y-0.5">
                {items.slice(0, MAX_PER_DAY).map(({ a, time }) => (
                  <li key={a.id}>
                    <Link
                      href={`/agenda/${a.id}`}
                      className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-xs hover:bg-canvas ${
                        a.status === 'ausente' ? 'line-through opacity-50' : ''
                      }`}
                    >
                      <span className={`size-1.5 shrink-0 rounded-full ${APPOINTMENT_TYPE_STYLE[a.type].dot}`} aria-hidden />
                      <span className="tabular-nums text-muted">{time}</span>
                      <span className="truncate font-semibold">{a.pet?.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {items.length > MAX_PER_DAY && (
                <Link href={agendaHref({ vista: 'dia', fecha: day, vet })} className="mt-0.5 block px-1 text-xs font-bold text-brand-600 hover:underline">
                  +{items.length - MAX_PER_DAY} más
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
