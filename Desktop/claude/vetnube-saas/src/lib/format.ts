const pad = (n: number) => String(n).padStart(2, '0')

export function formatMoney(value: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0)
}

export function formatTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('es-AR', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    new Date(iso),
  )
}

/** "2026-10-11" → "Domingo, 11 de octubre" */
export function formatLongDate(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  const text = new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  )
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "2026-10-11" → "11/10" */
export function formatShortDate(day: string) {
  const [, m, d] = day.split('-').map(Number)
  return `${pad(d)}/${pad(m)}`
}

export function addDays(day: string, days: number) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function greeting(timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
  return hour < 12 ? 'Buen día' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
}

/** Diferencia en ms entre la hora local de `timeZone` y UTC en un instante dado. */
function timeZoneOffsetMs(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const v = Object.fromEntries(parts.map((p) => [p.type, Number(p.value)]))
  return Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second) - instant.getTime()
}

/** Inicio y fin (UTC) de un día calendario en la zona horaria de la clínica. */
export function zonedDayRange(day: string, timeZone: string) {
  const [y, m, d] = day.split('-').map(Number)
  const startGuess = Date.UTC(y, m - 1, d)
  const endGuess = Date.UTC(y, m - 1, d + 1)
  return {
    start: new Date(startGuess - timeZoneOffsetMs(new Date(startGuess), timeZone)),
    end: new Date(endGuess - timeZoneOffsetMs(new Date(endGuess), timeZone)),
  }
}

/** Solo acepta rutas internas para evitar redirecciones abiertas. */
export function safeNext(value: FormDataEntryValue | string | null | undefined, fallback = '/dashboard') {
  const next = typeof value === 'string' ? value : ''
  return next.startsWith('/') && !next.startsWith('//') ? next : fallback
}

export function whatsappLink(phone: string | null | undefined, text: string) {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.length >= 8 ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null
}

/** "2026-10-11" → "11/10/2026" */
export function formatDate(day: string | null | undefined) {
  if (!day) return '—'
  const [y, m, d] = day.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function formatDateTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria de la clínica. */
export function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

/** ISO → valor para <input type="datetime-local"> en la zona de la clínica. */
export function toLocalInput(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(iso))
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return `${v.year}-${v.month}-${v.day}T${v.hour}:${v.minute}`
}

/** Valor de <input type="datetime-local"> en la zona de la clínica → ISO UTC. */
export function fromLocalInput(local: string | null, timeZone: string) {
  const m = local?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return null
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
  return new Date(guess - timeZoneOffsetMs(new Date(guess), timeZone)).toISOString()
}

/** Edad legible a partir de la fecha de nacimiento: "3 años 2 meses", "5 meses". */
export function petAge(birth: string | null | undefined, until?: string | null) {
  if (!birth) return null
  const [by, bm, bd] = birth.split('-').map(Number)
  const ref = until ? new Date(until) : new Date()
  let months = (ref.getFullYear() - by) * 12 + (ref.getMonth() + 1 - bm)
  if (ref.getDate() < bd) months--
  if (months < 1) return 'Menos de 1 mes'
  const years = Math.floor(months / 12)
  const rest = months % 12
  if (!years) return `${rest} ${rest === 1 ? 'mes' : 'meses'}`
  return `${years} ${years === 1 ? 'año' : 'años'}${rest ? ` ${rest} ${rest === 1 ? 'mes' : 'meses'}` : ''}`
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1).replace('.', ',')} MB`
}

export function fullName(person: { first_name: string; last_name: string } | null | undefined) {
  return person ? `${person.first_name} ${person.last_name}`.trim() : ''
}

/** Agrega o reemplaza un parámetro en una ruta interna ("/agenda?vista=dia" + error=...). */
export function withParam(path: string, key: string, value: string) {
  const url = new URL(path, 'http://local')
  url.searchParams.set(key, value)
  return `${url.pathname}${url.search}`
}
