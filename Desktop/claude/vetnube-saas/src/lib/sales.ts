import type { ServerSupabase } from '@/lib/supabase/server'
import type { CashSession, PaymentMethod } from '@/lib/types'

export async function getOpenCashSession(supabase: ServerSupabase, clinicId: string) {
  const { data } = await supabase
    .from('cash_sessions')
    .select('*, opener:profiles!cash_sessions_opened_by_fkey(full_name)')
    .eq('clinic_id', clinicId)
    .is('closed_at', null)
    .maybeSingle()
  return data as CashSession | null
}

/** Totales cobrados por forma de pago en una caja (sin pagos reintegrados por anulación). */
export async function sessionTotals(supabase: ServerSupabase, sessionId: string) {
  const { data } = await supabase.from('payments').select('method, amount').eq('cash_session_id', sessionId).is('refunded_at', null)
  const byMethod = new Map<PaymentMethod, number>()
  for (const p of (data ?? []) as { method: PaymentMethod; amount: number }[]) {
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + Number(p.amount))
  }
  const total = [...byMethod.values()].reduce((s, v) => s + v, 0)
  return { byMethod, total }
}
