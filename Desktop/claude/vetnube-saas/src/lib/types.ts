// Tipos que reflejan el esquema de supabase/migrations/20261011000000_init.sql.
// Más adelante se pueden generar automáticamente con `supabase gen types typescript`.

export type MemberRole = 'owner' | 'admin' | 'vet' | 'reception'
export type Species = 'canino' | 'felino' | 'ave' | 'conejo' | 'roedor' | 'reptil' | 'exotico' | 'otro'
export type AppointmentType = 'consulta' | 'control' | 'cirugia' | 'vacunacion' | 'peluqueria' | 'otro'
export type AppointmentStatus =
  | 'pendiente'
  | 'confirmado'
  | 'en_espera'
  | 'en_atencion'
  | 'atendido'
  | 'cancelado'
  | 'ausente'
export type ImmunizationKind = 'vacuna' | 'desparasitacion_interna' | 'desparasitacion_externa'

/** Preferencias guardadas en clinics.settings (jsonb) */
export type ClinicSettings = {
  agenda?: { start_hour?: number; end_hour?: number; slot_minutes?: number }
}

export type Clinic = {
  id: string
  name: string
  timezone: string
  currency: string
  settings: ClinicSettings | null
  role: MemberRole
}

/** Turno con los datos que muestran la agenda y su detalle */
export type AgendaAppointment = {
  id: string
  starts_at: string
  ends_at: string
  type: AppointmentType
  status: AppointmentStatus
  reason: string | null
  notes: string | null
  vet_id: string | null
  pet: {
    id: string
    name: string
    species: Species
    client: { id: string; first_name: string; last_name: string; phone: string | null } | null
  } | null
  vet: { full_name: string | null } | null
}

export type SessionUser = {
  id: string
  email: string
  fullName: string
}

/** Respuesta de la RPC public.dashboard_summary */
export type DashboardSummary = {
  date: string
  appointments_today: number
  attended_today: number
  waiting_now: number
  revenue_today: number
  sales_today: number
  vaccines_overdue: number
  vaccines_due_7d: number
  low_stock: number
  expiring_batches_30d: number
}

export type TodayAppointment = {
  id: string
  starts_at: string
  ends_at: string
  type: AppointmentType
  status: AppointmentStatus
  reason: string | null
  pet: {
    id: string
    name: string
    species: Species
    client: { first_name: string; last_name: string; phone: string | null } | null
  } | null
  vet: { full_name: string | null } | null
}

/** Fila de la vista public.v_immunizations_due */
export type DueImmunization = {
  immunization_id: string
  pet_id: string
  pet_name: string
  species: Species
  client_name: string
  phone: string | null
  kind: ImmunizationKind
  name: string
  next_due_on: string
  days_left: number
}

export type PetSex = 'macho' | 'hembra' | 'desconocido'
export type RecordType = 'consulta' | 'control' | 'cirugia' | 'urgencia' | 'internacion' | 'nota'

export type Client = {
  id: string
  first_name: string
  last_name: string
  document_id: string | null
  phone: string | null
  whatsapp_opt_in: boolean
  email: string | null
  address: string | null
  city: string | null
  notes: string | null
  created_at: string
}

export type Pet = {
  id: string
  client_id: string
  name: string
  species: Species
  breed: string | null
  sex: PetSex
  birth_date: string | null
  birth_date_estimated: boolean
  color: string | null
  neutered: boolean
  microchip: string | null
  weight_kg: number | null
  allergies: string | null
  chronic_conditions: string | null
  notes: string | null
  deceased_at: string | null
}

export type MedicalRecord = {
  id: string
  pet_id: string
  vet_id: string | null
  record_type: RecordType
  visit_at: string
  reason: string
  anamnesis: string | null
  physical_exam: string | null
  weight_kg: number | null
  temperature_c: number | null
  heart_rate_bpm: number | null
  respiratory_rate_rpm: number | null
  mucous_membranes: string | null
  capillary_refill_s: number | null
  body_condition_score: number | null
  diagnosis: string | null
  treatment: string | null
  prescription: string | null
  next_control_on: string | null
  vet?: { full_name: string | null } | null
}

export type Immunization = {
  id: string
  pet_id: string
  kind: ImmunizationKind
  name: string
  batch_number: string | null
  applied_on: string
  next_due_on: string | null
  vet_id: string | null
  notes: string | null
  vet?: { full_name: string | null } | null
}

export type Attachment = {
  id: string
  pet_id: string
  medical_record_id: string | null
  storage_path: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}

export type ProductCategory = 'medicamento' | 'alimento' | 'accesorio' | 'vacuna' | 'antiparasitario' | 'higiene' | 'servicio' | 'otro'
export type PaymentMethod = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'mercado_pago' | 'otro'
export type StockMovementType = 'compra' | 'venta' | 'ajuste' | 'anulacion_venta' | 'vencimiento' | 'uso_interno'

export type Product = {
  id: string
  sku: string | null
  barcode: string | null
  name: string
  category: ProductCategory
  description: string | null
  unit: string
  cost: number
  price: number
  tax_rate: number
  stock: number
  min_stock: number
  tracks_expiry: boolean
  is_service: boolean
  active: boolean
}

export type ProductBatch = {
  id: string
  product_id: string
  batch_number: string | null
  expires_on: string | null
  quantity: number
  received_at: string
}

export type CashSession = {
  id: string
  opened_at: string
  opening_amount: number
  closed_at: string | null
  expected_cash: number | null
  counted_cash: number | null
  notes: string | null
  opener?: { full_name: string | null } | null
  closer?: { full_name: string | null } | null
}

export type SaleItem = {
  id: string
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  discount: number
  line_total: number
}

export type Payment = {
  id: string
  method: PaymentMethod
  amount: number
  paid_at: string
  refunded_at: string | null
}
