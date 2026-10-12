import Link from 'next/link'
import { type AgendaHours, layoutLanes, localPosition, minutesToTime, newAppointmentHref } from '@/lib/agenda'
import type { AgendaAppointment } from '@/lib/types'
import { AppointmentBlock } from './appointment-block'

export type GridColumn = {
  key: string
  /** Encabezado de la columna (día o profesional) */
  header: React.ReactNode
  day: string
  vetId?: string | null
  isToday: boolean
  appointments: AgendaAppointment[]
}

type Props = {
  columns: GridColumn[]
  hours: AgendaHours
  timeZone: string
  /** Minuto actual de la clínica, para la línea roja de "ahora" (solo si hoy está visible) */
  nowMinutes: number | null
}

const HOUR_PX = 64
const MIN_BLOCK_PX = 22

/**
 * Grilla horaria compartida por la vista de día (columnas = profesionales)
 * y la de semana (columnas = días). Los huecos libres son links a "nuevo turno".
 */
export function TimeGrid({ columns, hours, timeZone, nowMinutes }: Props) {
  // Si hay turnos fuera del horario configurado, se amplía la grilla para mostrarlos
  const positioned = columns.map((col) =>
    col.appointments.map((a) => {
      const start = localPosition(a.starts_at, timeZone)
      const end = localPosition(a.ends_at, timeZone)
      const endMin = end.day === start.day ? end.minutes : 24 * 60
      return { appointment: a, start: start.minutes, end: Math.max(endMin, start.minutes + 5) }
    }),
  )
  const all = positioned.flat()
  const startHour = Math.min(hours.startHour, ...all.map((e) => Math.floor(e.start / 60)))
  const endHour = Math.max(hours.endHour, ...all.map((e) => Math.ceil(e.end / 60)))
  const gridStart = startHour * 60
  const totalMinutes = (endHour - startHour) * 60
  const height = (totalMinutes / 60) * HOUR_PX
  const slots = Array.from({ length: totalMinutes / hours.slotMinutes }, (_, i) => gridStart + i * hours.slotMinutes)
  const toPx = (min: number) => ((min - gridStart) / 60) * HOUR_PX

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
      <div
        className="grid min-w-full"
        style={{ gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(${columns.length > 3 ? '8.5rem' : '12rem'}, 1fr))` }}
      >
        {/* Encabezados */}
        <div className="sticky left-0 z-30 border-b border-line bg-white" />
        {columns.map((col) => (
          <div
            key={col.key}
            className={`border-b border-l border-line px-2 py-2 text-center text-sm ${col.isToday ? 'bg-brand-50/60' : ''}`}
          >
            {col.header}
          </div>
        ))}

        {/* Columna de horas */}
        <div className="sticky left-0 z-30 border-r border-line bg-white" style={{ height }}>
          {Array.from({ length: endHour - startHour }, (_, i) => (
            <div key={i} className="relative text-right text-[11px] text-muted tabular-nums" style={{ height: HOUR_PX }}>
              <span className="absolute -top-2 right-2">{i === 0 ? '' : minutesToTime((startHour + i) * 60)}</span>
            </div>
          ))}
        </div>

        {/* Columnas de turnos */}
        {columns.map((col, c) => {
          const events = layoutLanes(positioned[c])
          return (
            <div key={col.key} className={`relative border-l border-line ${col.isToday ? 'bg-brand-50/30' : ''}`} style={{ height }}>
              {slots.map((min) => (
                <Link
                  key={min}
                  href={newAppointmentHref({ fecha: col.day, hora: minutesToTime(min), vet: col.vetId })}
                  aria-label={`Nuevo turno ${col.day} ${minutesToTime(min)}`}
                  className={`group block border-line hover:bg-brand-50 ${min % 60 === 0 ? 'border-t' : 'border-t border-dashed border-t-line/60'}`}
                  style={{ height: (hours.slotMinutes / 60) * HOUR_PX }}
                >
                  <span className="hidden px-2 text-[11px] font-bold text-brand-600 group-hover:inline">+ {minutesToTime(min)}</span>
                </Link>
              ))}

              {events.map((e) => {
                const top = toPx(e.start)
                const blockHeight = Math.max(toPx(e.end) - top - 2, MIN_BLOCK_PX)
                const width = 100 / e.lanes
                return (
                  <AppointmentBlock
                    key={e.appointment.id}
                    appointment={e.appointment}
                    timeLabel={minutesToTime(e.start)}
                    compact={blockHeight < 38}
                    style={{ top: top + 1, height: blockHeight, left: `calc(${e.lane * width}% + 2px)`, width: `calc(${width}% - 4px)` }}
                  />
                )
              })}

              {col.isToday && nowMinutes !== null && nowMinutes >= gridStart && nowMinutes <= endHour * 60 && (
                <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-rose-500" style={{ top: toPx(nowMinutes) }}>
                  <span className="absolute -top-1.5 -left-1 size-2.5 rounded-full bg-rose-500" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
