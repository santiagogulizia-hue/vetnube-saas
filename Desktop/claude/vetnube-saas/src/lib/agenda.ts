// Lógica de calendario de la agenda. Las fechas viajan como "YYYY-MM-DD" (día
// calendario de la clínica) y las horas como minutos desde la medianoche local.
import { addDays, toLocalInput, zonedDayRange } from '@/lib/format'
import type { ClinicSettings } from '@/lib/types'

export type AgendaView = 'dia' | 'semana' | 'mes'

export const AGENDA_VIEWS: { key: AgendaView; label: string }[] = [
  { key: 'dia', label: 'Día' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
]

export const DURATIONS = [15, 20, 30, 45, 60, 90, 120, 180]

export const APPOINTMENT_SELECT =
  'id, starts_at, ends_at, type, status, reason, notes, vet_id, pet:pets(id, name, species, client:clients(id, first_name, last_name, phone)), vet:profiles!appointments_vet_id_fkey(full_name)'

const pad = (n: number) => String(n).padStart(2, '0')
const parts = (day: string) => day.split('-').map(Number) as [number, number, number]
const utc = (day: string) => {
  const [y, m, d] = parts(day)
  return new Date(Date.UTC(y, m - 1, d))
}

export const isDay = (v: string | null | undefined): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(utc(v).getTime())

export const isView = (v: string | undefined): v is AgendaView => v === 'dia' || v === 'semana' || v === 'mes'

/** 0 = lunes … 6 = domingo */
export const weekdayIndex = (day: string) => (utc(day).getUTCDay() + 6) % 7
export const startOfWeek = (day: string) => addDays(day, -weekdayIndex(day))

export function addMonths(day: string, n: number) {
  const [y, m, d] = parts(day)
  const lastDay = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m - 1 + n, Math.min(d, lastDay))).toISOString().slice(0, 10)
}

/** Días que muestra cada vista (el mes se completa con semanas enteras de lunes a domingo). */
export function visibleDays(view: AgendaView, day: string) {
  if (view === 'dia') return [day]
  if (view === 'semana') return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(day), i))
  const [y, m] = parts(day)
  const first = `${y}-${pad(m)}-01`
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  const start = startOfWeek(first)
  const end = addDays(startOfWeek(last), 6)
  const count = Math.round((utc(end).getTime() - utc(start).getTime()) / 86_400_000) + 1
  return Array.from({ length: count }, (_, i) => addDays(start, i))
}

export function shiftDate(view: AgendaView, day: string, direction: 1 | -1) {
  if (view === 'dia') return addDays(day, direction)
  if (view === 'semana') return addDays(day, 7 * direction)
  return addMonths(day, direction)
}

/** Rango UTC [desde, hasta) que cubre los días visibles en la zona de la clínica. */
export function utcRange(days: string[], timeZone: string) {
  return { from: zonedDayRange(days[0], timeZone).start, to: zonedDayRange(days[days.length - 1], timeZone).end }
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', ...opts })
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function dayHeader(day: string) {
  return { weekday: cap(fmt({ weekday: 'short' }).format(utc(day)).replace('.', '')), number: parts(day)[2] }
}

export function periodTitle(view: AgendaView, day: string) {
  if (view === 'dia') return cap(fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(utc(day)))
  if (view === 'mes') return cap(fmt({ month: 'long', year: 'numeric' }).format(utc(day)))
  const start = startOfWeek(day)
  const end = addDays(start, 6)
  const sameMonth = start.slice(0, 7) === end.slice(0, 7)
  const from = sameMonth ? String(parts(start)[2]) : fmt({ day: 'numeric', month: 'short' }).format(utc(start))
  return `${from} – ${fmt({ day: 'numeric', month: sameMonth ? 'long' : 'short', year: 'numeric' }).format(utc(end))}`
}

/** Día y minuto local (en la zona de la clínica) de un timestamp. */
export function localPosition(iso: string, timeZone: string) {
  const s = toLocalInput(iso, timeZone)
  return { day: s.slice(0, 10), minutes: Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16)) }
}

export const minutesToTime = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`

export type AgendaHours = { startHour: number; endHour: number; slotMinutes: number }

/** Horario visible de la grilla: configuración de la clínica (o 8 a 20 h, turnos de 30 min). */
export function agendaHours(settings: ClinicSettings | null): AgendaHours {
  const a = settings?.agenda ?? {}
  const startHour = Math.min(Math.max(Math.floor(a.start_hour ?? 8), 0), 23)
  const endHour = Math.min(Math.max(Math.ceil(a.end_hour ?? 20), startHour + 1), 24)
  const slotMinutes = [10, 15, 20, 30, 60].includes(a.slot_minutes ?? 0) ? (a.slot_minutes as number) : 30
  return { startHour, endHour, slotMinutes }
}

/**
 * Reparte turnos superpuestos en carriles para mostrarlos lado a lado.
 * Devuelve cada evento con su carril (`lane`) y la cantidad de carriles de su grupo (`lanes`).
 */
export function layoutLanes<T extends { start: number; end: number }>(items: T[]) {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end)
  const result: (T & { lane: number; lanes: number })[] = []
  let group: (T & { lane: number; lanes: number })[] = []
  let laneEnds: number[] = []
  let groupEnd = -1

  const flush = () => {
    group.forEach((g) => (g.lanes = laneEnds.length))
    result.push(...group)
    group = []
    laneEnds = []
    groupEnd = -1
  }

  for (const item of sorted) {
    if (group.length && item.start >= groupEnd) flush()
    let lane = laneEnds.findIndex((end) => end <= item.start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(item.end)
    } else {
      laneEnds[lane] = item.end
    }
    group.push({ ...item, lane, lanes: 1 })
    groupEnd = Math.max(groupEnd, item.end)
  }
  if (group.length) flush()
  return result
}

export function agendaHref(params: { vista?: AgendaView; fecha?: string; vet?: string }) {
  const sp = new URLSearchParams()
  if (params.vista) sp.set('vista', params.vista)
  if (params.fecha) sp.set('fecha', params.fecha)
  if (params.vet) sp.set('vet', params.vet)
  const qs = sp.toString()
  return qs ? `/agenda?${qs}` : '/agenda'
}

export function newAppointmentHref(params: { fecha: string; hora?: string; vet?: string | null; paciente?: string }) {
  const sp = new URLSearchParams({ fecha: params.fecha })
  if (params.hora) sp.set('hora', params.hora)
  if (params.vet) sp.set('vet', params.vet)
  if (params.paciente) sp.set('paciente', params.paciente)
  return `/agenda/nuevo?${sp.toString()}`
}
