import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertTriangle, CalendarDays, Mail, MapPin, MessageCircle, Pencil, Phone, Plus, Receipt, ShoppingCart } from 'lucide-react'
import { primaryButton, secondaryButton } from '@/components/forms/fields'
import { AccountPaymentForm } from '@/components/pos/sale-forms'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { PetAvatar } from '@/components/ui/pet-avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { requireClinic } from '@/lib/clinic'
import { formatDate, formatDateTime, formatMoney, fullName, petAge, whatsappLink } from '@/lib/format'
import { APPOINTMENT_TYPE, PET_SEX, SPECIES } from '@/lib/labels'
import type { AppointmentStatus, AppointmentType, Client, Pet } from '@/lib/types'
import { registerAccountPayment } from '../../ventas/actions'

export const metadata: Metadata = { title: 'Ficha del cliente' }

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ creado?: string }> }

type SaleRow = {
  id: string
  number: number
  sold_at: string
  total: number
  status: 'completada' | 'anulada'
  sale_items: { description: string; quantity: number }[]
}
type UpcomingRow = { id: string; starts_at: string; type: AppointmentType; status: AppointmentStatus; pet: { name: string } | null }

export default async function ClientePage({ params, searchParams }: Props) {
  const [{ id }, { creado }] = await Promise.all([params, searchParams])
  const { supabase, clinic } = await requireClinic()

  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('clinic_id', clinic.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!data) notFound()
  const client = data as Client

  const [petsRes, balanceRes, salesRes] = await Promise.all([
    supabase.from('pets').select('*').eq('client_id', id).is('deleted_at', null).order('deceased_at', { nullsFirst: true }).order('name'),
    supabase.from('v_client_balances').select('balance, total_purchased').eq('client_id', id).maybeSingle(),
    supabase
      .from('sales')
      .select('id, number, sold_at, total, status, sale_items(description, quantity)')
      .eq('client_id', id)
      .order('sold_at', { ascending: false })
      .limit(8),
  ])
  const pets = (petsRes.data ?? []) as Pet[]
  const sales = (salesRes.data ?? []) as unknown as SaleRow[]
  const balance = Number(balanceRes.data?.balance ?? 0)

  const { data: upcomingData } = pets.length
    ? await supabase
        .from('appointments')
        .select('id, starts_at, type, status, pet:pets(name)')
        .in('pet_id', pets.map((p) => p.id))
        .gte('starts_at', new Date().toISOString())
        .not('status', 'in', '(cancelado,ausente)')
        .order('starts_at')
        .limit(5)
    : { data: [] }
  const upcoming = (upcomingData ?? []) as unknown as UpcomingRow[]

  const name = fullName(client)
  const wa = whatsappLink(client.phone, `Hola ${client.first_name}, te escribimos de ${clinic.name}.`)

  return (
    <div className="space-y-5">
      <PageHeader
        title={name}
        description={[client.document_id && `DNI ${client.document_id}`, `Cliente desde ${formatDate(client.created_at)}`]
          .filter(Boolean)
          .join(' · ')}
        back={{ href: '/clientes', label: 'Clientes' }}
        actions={
          <>
            <Link href={`/ventas/nueva?cliente=${id}`} className={secondaryButton}>
              <ShoppingCart className="size-4" aria-hidden />
              Nueva venta
            </Link>
            <Link href={`/clientes/${id}/editar`} className={secondaryButton}>
              <Pencil className="size-4" aria-hidden />
              Editar
            </Link>
            <Link href={`/pacientes/nuevo?cliente=${id}`} className={primaryButton}>
              <Plus className="size-4" aria-hidden />
              Agregar mascota
            </Link>
          </>
        }
      />

      {creado && pets.length === 0 && (
        <p role="status" className="rounded-lg bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 ring-1 ring-brand-200">
          Cliente guardado. Ahora cargá su mascota con el botón «Agregar mascota».
        </p>
      )}

      <section className="grid grid-cols-1 gap-4 rounded-xl border border-line bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Fact icon={Phone} label="Teléfono">
          {client.phone ?? '—'}
          {wa && client.whatsapp_opt_in && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
              <MessageCircle className="size-3.5" aria-hidden />
              WhatsApp
            </a>
          )}
          {!client.whatsapp_opt_in && <p className="text-xs text-muted">No acepta recordatorios</p>}
        </Fact>
        <Fact icon={Mail} label="Email">
          {client.email ?? '—'}
        </Fact>
        <Fact icon={MapPin} label="Dirección">
          {[client.address, client.city].filter(Boolean).join(', ') || '—'}
        </Fact>
        <Fact icon={Receipt} label="Cuenta corriente">
          {balance > 0 ? (
            <span className="font-bold text-rose-700">Debe {formatMoney(balance, clinic.currency)}</span>
          ) : (
            <span className="font-bold text-emerald-700">Al día</span>
          )}
        </Fact>
        {client.notes && (
          <p className="rounded-lg bg-canvas px-3 py-2 text-sm whitespace-pre-line text-muted sm:col-span-2 lg:col-span-4">{client.notes}</p>
        )}
      </section>

      {balance > 0 && (
        <section id="cuenta-corriente" className="scroll-mt-20">
          <Card title={`Cuenta corriente · debe ${formatMoney(balance, clinic.currency)}`}>
            <AccountPaymentForm action={registerAccountPayment.bind(null, id, `/clientes/${id}`)} balance={balance} currency={clinic.currency} />
          </Card>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card title={`Mascotas (${pets.length})`}>
          {pets.length === 0 ? (
            <p className="py-4 text-sm text-muted">Este cliente todavía no tiene mascotas registradas.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {pets.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/pacientes/${p.id}`}
                    className={`flex h-full gap-3 rounded-lg border border-line p-3 transition-colors hover:border-brand-500 ${p.deceased_at ? 'opacity-60' : ''}`}
                  >
                    <PetAvatar name={p.name} species={p.species} />
                    <div className="min-w-0">
                      <p className="font-bold">
                        {p.name}
                        {p.deceased_at && <span className="ml-2 text-xs font-semibold text-muted">Fallecido</span>}
                      </p>
                      <p className="text-sm text-muted">
                        {[SPECIES[p.species].label, p.breed, PET_SEX[p.sex], petAge(p.birth_date, p.deceased_at)].filter(Boolean).join(' · ')}
                      </p>
                      {p.allergies && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-rose-700">
                          <AlertTriangle className="size-3.5" aria-hidden />
                          {p.allergies}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Próximos turnos">
            {upcoming.length === 0 ? (
              <p className="py-2 text-sm text-muted">Sin turnos agendados.</p>
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <CalendarDays className="size-4 shrink-0 text-brand-600" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <Link href={`/agenda/${a.id}`} className="text-sm font-bold hover:text-brand-600">
                        {formatDateTime(a.starts_at, clinic.timezone)}
                      </Link>
                      <p className="truncate text-xs text-muted">
                        {a.pet?.name} · {APPOINTMENT_TYPE[a.type]}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Últimas compras">
            {sales.length === 0 ? (
              <p className="py-2 text-sm text-muted">Todavía no hay compras registradas.</p>
            ) : (
              <ul className="divide-y divide-line">
                {sales.map((s) => (
                  <li key={s.id} className={`flex items-start gap-3 py-2.5 ${s.status === 'anulada' ? 'opacity-50' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">
                        #{s.number} · {formatDateTime(s.sold_at, clinic.timezone)}
                        {s.status === 'anulada' && <span className="ml-2 text-xs text-rose-700">Anulada</span>}
                      </p>
                      <Link href={`/ventas/${s.id}`} className="block truncate text-xs text-muted hover:text-brand-600">
                        {s.sale_items.map((i) => (i.quantity > 1 ? `${i.quantity}× ${i.description}` : i.description)).join(', ')}
                      </Link>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{formatMoney(Number(s.total), clinic.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Fact({ icon: Icon, label, children }: { icon: typeof Phone; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
      <div className="min-w-0 text-sm">
        <p className="text-xs font-bold tracking-wider text-muted uppercase">{label}</p>
        <div className="mt-0.5 break-words">{children}</div>
      </div>
    </div>
  )
}
