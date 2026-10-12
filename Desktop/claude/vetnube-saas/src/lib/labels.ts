import type { AppointmentStatus, AppointmentType, ImmunizationKind, MemberRole, Species } from '@/lib/types'

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
  confirmado: { label: 'Confirmado', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  en_espera: { label: 'En espera', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  en_atencion: { label: 'En atención', className: 'bg-violet-50 text-violet-700 ring-violet-200' },
  atendido: { label: 'Atendido', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  cancelado: { label: 'Cancelado', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  ausente: { label: 'Ausente', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

export const APPOINTMENT_TYPE: Record<AppointmentType, string> = {
  consulta: 'Consulta',
  control: 'Control',
  cirugia: 'Cirugía',
  vacunacion: 'Vacunación',
  peluqueria: 'Baño y peluquería',
  otro: 'Otro',
}

export const SPECIES: Record<Species, { label: string; className: string }> = {
  canino: { label: 'Canino', className: 'bg-sky-100 text-sky-800' },
  felino: { label: 'Felino', className: 'bg-amber-100 text-amber-800' },
  ave: { label: 'Ave', className: 'bg-emerald-100 text-emerald-800' },
  conejo: { label: 'Conejo', className: 'bg-rose-100 text-rose-800' },
  roedor: { label: 'Roedor', className: 'bg-orange-100 text-orange-800' },
  reptil: { label: 'Reptil', className: 'bg-lime-100 text-lime-800' },
  exotico: { label: 'Exótico', className: 'bg-violet-100 text-violet-800' },
  otro: { label: 'Otro', className: 'bg-brand-100 text-brand-700' },
}

export const IMMUNIZATION_KIND: Record<ImmunizationKind, string> = {
  vacuna: 'Vacuna',
  desparasitacion_interna: 'Desparasitación interna',
  desparasitacion_externa: 'Desparasitación externa',
}

export const ROLE_LABEL: Record<MemberRole, string> = {
  owner: 'Dueño/a',
  admin: 'Administración',
  vet: 'Veterinario/a',
  reception: 'Recepción',
}

export const PET_SEX: Record<import('@/lib/types').PetSex, string> = {
  macho: 'Macho',
  hembra: 'Hembra',
  desconocido: 'Sin dato',
}

export const RECORD_TYPE: Record<import('@/lib/types').RecordType, string> = {
  consulta: 'Consulta',
  control: 'Control',
  cirugia: 'Cirugía',
  urgencia: 'Urgencia',
  internacion: 'Internación',
  nota: 'Nota clínica',
}

/** Opciones para <select>: [valor, etiqueta] */
export const options = <K extends string>(map: Record<K, string | { label: string }>) =>
  (Object.entries(map) as [K, string | { label: string }][]).map(
    ([value, v]) => [value, typeof v === 'string' ? v : v.label] as const,
  )

/** Colores de cada tipo de turno en la agenda */
export const APPOINTMENT_TYPE_STYLE: Record<import('@/lib/types').AppointmentType, { block: string; dot: string }> = {
  consulta: { block: 'border-brand-500 bg-brand-50 text-brand-700', dot: 'bg-brand-500' },
  control: { block: 'border-sky-500 bg-sky-50 text-sky-800', dot: 'bg-sky-500' },
  cirugia: { block: 'border-violet-500 bg-violet-50 text-violet-800', dot: 'bg-violet-500' },
  vacunacion: { block: 'border-emerald-500 bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  peluqueria: { block: 'border-amber-500 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  otro: { block: 'border-slate-400 bg-slate-50 text-slate-700', dot: 'bg-slate-400' },
}

export const PRODUCT_CATEGORY: Record<import('@/lib/types').ProductCategory, string> = {
  medicamento: 'Medicamentos',
  alimento: 'Alimentos',
  accesorio: 'Accesorios',
  vacuna: 'Vacunas',
  antiparasitario: 'Antiparasitarios',
  higiene: 'Higiene',
  servicio: 'Servicios',
  otro: 'Otros',
}

export const PAYMENT_METHOD: Record<import('@/lib/types').PaymentMethod, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
  mercado_pago: 'Mercado Pago',
  otro: 'Otro',
}

export const STOCK_MOVEMENT: Record<import('@/lib/types').StockMovementType, string> = {
  compra: 'Ingreso de mercadería',
  venta: 'Venta',
  ajuste: 'Ajuste',
  anulacion_venta: 'Anulación de venta',
  vencimiento: 'Baja por vencimiento',
  uso_interno: 'Uso interno',
}
