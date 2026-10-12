// Opciones de configuración de la clínica

export const TIMEZONES: [string, string][] = [
  ['America/Argentina/Buenos_Aires', 'Argentina (Buenos Aires)'],
  ['America/Montevideo', 'Uruguay (Montevideo)'],
  ['America/Santiago', 'Chile (Santiago)'],
  ['America/Asuncion', 'Paraguay (Asunción)'],
  ['America/La_Paz', 'Bolivia (La Paz)'],
  ['America/Lima', 'Perú (Lima)'],
  ['America/Bogota', 'Colombia (Bogotá)'],
  ['America/Guayaquil', 'Ecuador (Guayaquil)'],
  ['America/Caracas', 'Venezuela (Caracas)'],
  ['America/Mexico_City', 'México (Ciudad de México)'],
  ['America/Costa_Rica', 'Costa Rica'],
  ['America/Panama', 'Panamá'],
  ['America/Santo_Domingo', 'República Dominicana'],
  ['Europe/Madrid', 'España (Madrid)'],
]

export const CURRENCIES: [string, string][] = [
  ['ARS', 'Peso argentino (ARS)'],
  ['UYU', 'Peso uruguayo (UYU)'],
  ['CLP', 'Peso chileno (CLP)'],
  ['PYG', 'Guaraní (PYG)'],
  ['BOB', 'Boliviano (BOB)'],
  ['PEN', 'Sol (PEN)'],
  ['COP', 'Peso colombiano (COP)'],
  ['MXN', 'Peso mexicano (MXN)'],
  ['CRC', 'Colón (CRC)'],
  ['DOP', 'Peso dominicano (DOP)'],
  ['USD', 'Dólar (USD)'],
  ['EUR', 'Euro (EUR)'],
]

export const COUNTRIES: [string, string][] = [
  ['AR', 'Argentina'],
  ['UY', 'Uruguay'],
  ['CL', 'Chile'],
  ['PY', 'Paraguay'],
  ['BO', 'Bolivia'],
  ['PE', 'Perú'],
  ['CO', 'Colombia'],
  ['EC', 'Ecuador'],
  ['VE', 'Venezuela'],
  ['MX', 'México'],
  ['CR', 'Costa Rica'],
  ['PA', 'Panamá'],
  ['DO', 'República Dominicana'],
  ['ES', 'España'],
]

export const SLOT_OPTIONS = [10, 15, 20, 30, 60]

/** Qué puede hacer cada rol (coincide con las políticas RLS de la base). */
export const ROLE_PERMISSIONS: { role: 'owner' | 'admin' | 'vet' | 'reception'; can: string }[] = [
  { role: 'owner', can: 'Todo: datos de la clínica, equipo y roles, anular ventas, reportes de ganancias.' },
  { role: 'admin', can: 'Igual que el dueño/a, salvo cambiar roles o dar de baja a miembros del equipo.' },
  { role: 'vet', can: 'Historia clínica, agenda, ventas e inventario (incluye ajustes de stock). No ve reportes de ganancias.' },
  { role: 'reception', can: 'Agenda, clientes, pacientes, ventas y caja. Lee la historia clínica pero no la edita.' },
]
