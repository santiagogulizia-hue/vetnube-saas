// Planes y estado de la suscripción de cada clínica a VetNube.
// Se comparte entre servidor y cliente: no importa nada secreto.

export type SubscriptionStatus = 'trial' | 'pending' | 'active' | 'past_due' | 'paused' | 'cancelled'

export type Plan = { key: string; name: string; price: number; currency: string; features: string[] }

/**
 * El precio vive SOLO en el servidor: el navegador nunca lo envía.
 * Para cambiarlo, editá este valor (las suscripciones existentes conservan su monto).
 */
export const PLANS: Record<string, Plan> = {
  profesional: {
    key: 'profesional',
    name: 'Plan Profesional',
    price: 15000,
    currency: 'ARS',
    features: [
      'Historias clínicas, vacunas y archivos ilimitados',
      'Agenda con sala de espera en tiempo real',
      'Punto de venta, caja diaria e inventario con lotes (FEFO)',
      'Reportes de ventas y ganancias',
      'Equipo ilimitado con roles y permisos',
    ],
  },
}

export const DEFAULT_PLAN = PLANS.profesional
export const planFor = (key: string | null | undefined) => PLANS[key ?? ''] ?? DEFAULT_PLAN

export const STATUS_LABEL: Record<SubscriptionStatus, { label: string; className: string }> = {
  trial: { label: 'Prueba gratuita', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  pending: { label: 'Pendiente de pago', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  active: { label: 'Activa', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  past_due: { label: 'Pago rechazado', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  paused: { label: 'Pausada', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
  cancelled: { label: 'Cancelada', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

export type BillingInfo = {
  plan: string
  subscription_status: SubscriptionStatus
  trial_ends_at: string
  next_billing_at: string | null
  mp_preapproval_id?: string | null
}

/** Resumen para la interfaz: días de prueba, si hay que avisar, etc. */
export function billingState(b: BillingInfo, now = Date.now()) {
  const trialMs = Date.parse(b.trial_ends_at) - now
  const trialDaysLeft = Math.max(Math.ceil(trialMs / 86_400_000), 0)
  const inTrial = b.subscription_status === 'trial' && trialMs > 0
  const trialExpired = b.subscription_status === 'trial' && trialMs <= 0
  const active = b.subscription_status === 'active'
  const paidUntilMs = b.next_billing_at ? Date.parse(b.next_billing_at) - now : 0
  // Espejo de clinic_is_writable() en la base (migración 20261028000000)
  const readOnly =
    trialExpired ||
    (b.subscription_status === 'pending' && trialMs <= 0) ||
    ((b.subscription_status === 'cancelled' || b.subscription_status === 'paused') && paidUntilMs <= 0)
  return {
    status: b.subscription_status,
    plan: planFor(b.plan),
    inTrial,
    trialExpired,
    trialDaysLeft,
    active,
    /** Sin suscripción vigente: se ven los datos pero no se puede cargar ni modificar nada */
    readOnly,
    /** Acceso sin cargo otorgado a mano (activa sin suscripción de Mercado Pago) */
    complimentary: active && b.mp_preapproval_id === null,
    /** Necesita suscribirse o regularizar el pago */
    needsAction: trialExpired || b.subscription_status === 'past_due' || b.subscription_status === 'cancelled' || b.subscription_status === 'paused',
  }
}

/** Estado de una suscripción (preapproval) de Mercado Pago → estado en VetNube. */
export function mapPreapprovalStatus(mpStatus: string | undefined): SubscriptionStatus | null {
  switch (mpStatus) {
    case 'authorized':
      return 'active'
    case 'paused':
      return 'paused'
    case 'cancelled':
      return 'cancelled'
    case 'pending':
      return 'pending'
    default:
      return null
  }
}
