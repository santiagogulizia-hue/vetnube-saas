// Helpers para leer y validar FormData en Server Actions.
import type { FormState } from '@/lib/form-state'

export function text(fd: FormData, key: string) {
  const value = String(fd.get(key) ?? '').trim()
  return value === '' ? null : value
}

/** Número opcional: null si está vacío, NaN si no es válido. Acepta "1.234,50", "1234,5" y "1234.5". */
export function num(fd: FormData, key: string) {
  const value = text(fd, key)
  if (value === null) return null
  const clean = value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value
  const n = Number(clean)
  return Number.isFinite(n) ? n : NaN
}

export function bool(fd: FormData, key: string) {
  return fd.get(key) === 'on'
}

export function oneOf<T extends string>(fd: FormData, key: string, allowed: readonly T[]) {
  const value = text(fd, key)
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function uuid(fd: FormData, key: string) {
  const value = text(fd, key)
  return value && UUID.test(value) ? value : null
}

export const isDate = (v: string | null): v is string => v !== null && /^\d{4}-\d{2}-\d{2}$/.test(v)

function submittedValues(fd: FormData) {
  const values: Record<string, string> = {}
  fd.forEach((value, key) => {
    if (typeof value === 'string' && !key.startsWith('$ACTION')) values[key] = value
  })
  return values
}

/** Respuesta de error que conserva lo que escribió el usuario. */
export function failure(fd: FormData, error?: string, fieldErrors?: Record<string, string>): FormState {
  return { error, fieldErrors, values: submittedValues(fd), submittedAt: Date.now() }
}

type DbError = { code?: string; message: string }

/** Traduce los errores de Postgres/PostgREST más comunes a mensajes para el usuario. */
export function dbErrorMessage(error: DbError) {
  switch (error.code) {
    case '23505':
      if (error.message.includes('document_id')) return 'Ya existe un cliente con ese documento en la clínica.'
      if (error.message.includes('microchip')) return 'Ya hay un paciente con ese número de microchip.'
      return 'Ya existe un registro con esos datos.'
    case '42501':
      return 'Tu rol no tiene permiso para realizar esta acción.'
    case '23503':
      return 'Este registro está vinculado a otros datos y no se puede modificar así.'
    case '23P01':
      // Restricción appointments_no_overlap de la Fase 1
      return 'El profesional ya tiene otro turno en ese horario. Elegí otra hora u otro profesional.'
    case '23514':
      return 'Algún valor está fuera del rango permitido. Revisá los datos.'
    case 'VN402':
      // Trigger de la migración 20261028000000: clínica sin suscripción vigente
      return 'La clínica está en modo solo lectura porque la suscripción no está vigente. Suscribite en Configuración → Plan y facturación.'
    default:
      return error.message
  }
}

/** Limpia el texto de búsqueda para usarlo dentro de un filtro `or()` de PostgREST. */
export function cleanSearch(q: string | undefined) {
  return (q ?? '').replace(/[,()%*\\.:"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
}
