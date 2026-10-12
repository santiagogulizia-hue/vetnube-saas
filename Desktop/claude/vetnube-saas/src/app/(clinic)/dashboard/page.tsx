import type { Metadata } from 'next'
import { CalendarDays, PawPrint, Syringe, Wallet } from 'lucide-react'
import { InventoryAlerts } from '@/components/dashboard/inventory-alerts'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { StatCard } from '@/components/dashboard/stat-card'
import { TodayAppointments } from '@/components/dashboard/today-appointments'
import { VaccinesDue } from '@/components/dashboard/vaccines-due'
import { requireClinic } from '@/lib/clinic'
import { addDays, formatLongDate, formatMoney, greeting, zonedDayRange } from '@/lib/format'
import type { DashboardSummary, DueImmunization, TodayAppointment } from '@/lib/types'

export const metadata: Metadata = { title: 'Inicio' }

export default async function DashboardPage() {
  const { supabase, clinic, user } = await requireClinic()

  // 1. Métricas agregadas (RPC creada en la Fase 1)
  const { data: summaryData, error: summaryError } = await supabase.rpc('dashboard_summary', {
    p_clinic_id: clinic.id,
  })
  if (summaryError) throw new Error(`No se pudo cargar el resumen: ${summaryError.message}`)
  const summary = summaryData as DashboardSummary

  // 2. Detalle en paralelo: pacientes, tutores, turnos de hoy y vacunas por vencer
  const { start, end } = zonedDayRange(summary.date, clinic.timezone)
  const [petsRes, clientsRes, appointmentsRes, dueRes] = await Promise.all([
    supabase
      .from('pets')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinic.id)
      .is('deleted_at', null)
      .is('deceased_at', null),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinic.id)
      .is('deleted_at', null),
    supabase
      .from('appointments')
      .select(
        'id, starts_at, ends_at, type, status, reason, pet:pets(id, name, species, client:clients(first_name, last_name, phone)), vet:profiles!appointments_vet_id_fkey(full_name)',
      )
      .eq('clinic_id', clinic.id)
      .gte('starts_at', start.toISOString())
      .lt('starts_at', end.toISOString())
      .order('starts_at'),
    supabase
      .from('v_immunizations_due')
      .select('immunization_id, pet_id, pet_name, species, client_name, phone, kind, name, next_due_on, days_left')
      .eq('clinic_id', clinic.id)
      .lte('next_due_on', addDays(summary.date, 7))
      .order('next_due_on')
      .limit(6),
  ])

  const failed = [petsRes, clientsRes, appointmentsRes, dueRes].find((r) => r.error)
  if (failed?.error) throw new Error(failed.error.message)

  const appointments = (appointmentsRes.data ?? []) as unknown as TodayAppointment[]
  const due = (dueRes.data ?? []) as unknown as DueImmunization[]
  const pending = Math.max(summary.appointments_today - summary.attended_today, 0)
  const vaccinesTotal = summary.vaccines_overdue + summary.vaccines_due_7d

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-brand-600 uppercase">{formatLongDate(summary.date)}</p>
          <h2 className="mt-1 font-display text-3xl font-bold text-balance">
            {greeting(clinic.timezone)}, {user.fullName.split(' ')[0]}
          </h2>
          <p className="mt-1 text-muted">
            {summary.appointments_today === 0
              ? `No hay turnos agendados hoy en ${clinic.name}.`
              : `${pending} de ${summary.appointments_today} turnos por atender hoy en ${clinic.name}.`}
          </p>
        </div>
      </section>

      <section aria-label="Resumen del día" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Turnos de hoy"
          value={summary.appointments_today}
          detail={`${summary.attended_today} atendidos · ${pending} por atender`}
          icon={CalendarDays}
          href="/agenda"
        />
        <StatCard
          label="Pacientes activos"
          value={petsRes.count ?? 0}
          detail={`${clientsRes.count ?? 0} tutores registrados`}
          icon={PawPrint}
          href="/pacientes"
        />
        <StatCard
          label="Ingresos de hoy"
          value={formatMoney(Number(summary.revenue_today), clinic.currency)}
          detail={`${summary.sales_today} ${summary.sales_today === 1 ? 'venta' : 'ventas'}`}
          icon={Wallet}
          href="/ventas"
        />
        <StatCard
          label="Vacunas a vencer"
          value={vaccinesTotal}
          detail={
            summary.vaccines_overdue > 0
              ? `${summary.vaccines_overdue} ya vencidas`
              : 'Ninguna vencida · próximos 7 días'
          }
          icon={Syringe}
          tone={summary.vaccines_overdue > 0 ? 'alert' : 'default'}
          href="/pacientes"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <TodayAppointments appointments={appointments} timeZone={clinic.timezone} waiting={summary.waiting_now} />
        <div className="space-y-6">
          <QuickActions />
          <VaccinesDue items={due} clinicName={clinic.name} />
          <InventoryAlerts lowStock={summary.low_stock} expiring={summary.expiring_batches_30d} />
        </div>
      </div>
    </div>
  )
}
