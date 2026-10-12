import type { Metadata } from 'next'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { PlanTab } from '@/components/billing/plan-tab'
import { ConfirmSubmit } from '@/components/forms/buttons'
import { inputClass } from '@/components/forms/fields'
import {
  AgendaSettingsForm,
  ClinicDataForm,
  CopyButton,
  InviteForm,
  ProfileForm,
} from '@/components/settings/settings-forms'
import { Card } from '@/components/ui/card'
import { ErrorNotice } from '@/components/ui/notice'
import { PageHeader } from '@/components/ui/page-header'
import { Pill } from '@/components/ui/pill'
import { agendaHours } from '@/lib/agenda'
import { requireClinic } from '@/lib/clinic'
import { formatDate } from '@/lib/format'
import { ROLE_LABEL } from '@/lib/labels'
import { getOrigin } from '@/lib/origin'
import { canManageClinic, isOwner } from '@/lib/permissions'
import { ROLE_PERMISSIONS } from '@/lib/settings-options'
import type { MemberRole } from '@/lib/types'
import {
  changeMemberRole,
  createInvitation,
  revokeInvitation,
  setMemberActive,
  switchClinic,
  updateAgendaSettings,
  updateClinicData,
  updateMyProfile,
} from './actions'

export const metadata: Metadata = { title: 'Configuración' }

const TABS = [
  { key: 'clinica', label: 'Clínica' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'equipo', label: 'Equipo y roles' },
  { key: 'plan', label: 'Plan y facturación' },
  { key: 'perfil', label: 'Mi perfil' },
] as const
type Tab = (typeof TABS)[number]['key']

type Props = { searchParams: Promise<{ tab?: string; ok?: string; error?: string; mp?: string }> }

export default async function ConfiguracionPage({ searchParams }: Props) {
  const sp = await searchParams
  const { supabase, clinic, user, clinics } = await requireClinic()
  const manager = canManageClinic(clinic.role)
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : manager ? 'clinica' : 'perfil'

  let content: React.ReactNode
  if (tab === 'clinica') {
    const { data } = await supabase.from('clinics').select('name, tax_id, phone, email, address, city, country_code, timezone, currency').eq('id', clinic.id).single()
    content = <ClinicDataForm action={updateClinicData} initial={data ?? {}} readOnly={!manager} />
  } else if (tab === 'agenda') {
    const h = agendaHours(clinic.settings)
    content = (
      <AgendaSettingsForm
        action={updateAgendaSettings}
        initial={{ start_hour: h.startHour, end_hour: h.endHour, slot_minutes: h.slotMinutes }}
        readOnly={!manager}
      />
    )
  } else if (tab === 'plan') {
    content = <PlanTab supabase={supabase} clinic={clinic} userEmail={user.email} mp={sp.mp} />
  } else if (tab === 'equipo') {
    content = <TeamTab />
  } else {
    const { data: profile } = await supabase.from('profiles').select('full_name, phone, license_number').eq('id', user.id).single()
    content = (
      <div className="space-y-5">
        <ProfileForm action={updateMyProfile} initial={profile ?? {}} email={user.email} />
        {clinics.length > 1 && (
          <Card title="Mis clínicas">
            <p className="mb-3 text-sm text-muted">Trabajás en más de una clínica. Elegí con cuál querés operar.</p>
            <ul className="divide-y divide-line">
              {clinics.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-bold">{c.name}</p>
                    <p className="text-xs text-muted">{ROLE_LABEL[c.role]}</p>
                  </div>
                  {c.id === clinic.id ? (
                    <Pill label="Activa" className="bg-brand-50 text-brand-700 ring-brand-200" />
                  ) : (
                    <form action={switchClinic.bind(null, c.id)}>
                      <button className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-bold hover:border-brand-500">Cambiar a esta</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    )
  }

  async function TeamTab() {
    const [{ data: teamData, error: teamError }, { data: invitesData }, origin] = await Promise.all([
      supabase.rpc('clinic_team', { p_clinic_id: clinic.id }),
      manager
        ? supabase
            .from('clinic_invitations')
            .select('id, email, role, token, expires_at')
            .eq('clinic_id', clinic.id)
            .is('accepted_at', null)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      getOrigin(),
    ])
    if (teamError) throw new Error(`No se pudo cargar el equipo: ${teamError.message}. ¿Ejecutaste la migración 20261012000000_reports_and_team.sql?`)
    const team = (teamData ?? []) as {
      user_id: string
      full_name: string | null
      email: string
      license_number: string | null
      role: MemberRole
      active: boolean
      joined_at: string
    }[]
    const invites = (invitesData ?? []) as { id: string; email: string; role: MemberRole; token: string; expires_at: string }[]
    const owner = isOwner(clinic.role)
    const now = Date.now()

    return (
      <div className="space-y-5">
        <Card title={`Equipo (${team.filter((m) => m.active).length} activos)`}>
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs tracking-wider text-muted uppercase">
                  <th className="px-5 py-2 font-bold">Persona</th>
                  <th className="px-5 py-2 font-bold">Rol</th>
                  <th className="px-5 py-2 font-bold">Desde</th>
                  <th className="px-5 py-2 font-bold">Estado</th>
                  {owner && (
                    <th className="px-5 py-2">
                      <span className="sr-only">Acciones</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {team.map((m) => {
                  const editable = owner && m.user_id !== user.id && m.role !== 'owner'
                  return (
                    <tr key={m.user_id} className={m.active ? '' : 'opacity-60'}>
                      <td className="px-5 py-3">
                        <p className="font-bold">
                          {m.full_name || 'Sin nombre'}
                          {m.user_id === user.id && <span className="ml-1.5 text-xs font-semibold text-muted">(vos)</span>}
                        </p>
                        <p className="text-xs text-muted">
                          {m.email}
                          {m.license_number && ` · Mat. ${m.license_number}`}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        {editable && m.active ? (
                          <form action={changeMemberRole.bind(null, m.user_id)} className="flex items-center gap-2">
                            <select name="role" defaultValue={m.role} aria-label={`Rol de ${m.full_name ?? m.email}`} className={`${inputClass} w-auto py-1.5`}>
                              {(['admin', 'vet', 'reception'] as const).map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABEL[r]}
                                </option>
                              ))}
                            </select>
                            <button className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold hover:border-brand-500">Guardar</button>
                          </form>
                        ) : (
                          <span className="font-semibold">{ROLE_LABEL[m.role]}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted tabular-nums">{formatDate(m.joined_at)}</td>
                      <td className="px-5 py-3">
                        <Pill
                          label={m.active ? 'Activo' : 'Dado de baja'}
                          className={m.active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}
                        />
                      </td>
                      {owner && (
                        <td className="px-5 py-3 text-right">
                          {editable && (
                            <form action={setMemberActive.bind(null, m.user_id, !m.active)}>
                              <ConfirmSubmit label={m.active ? 'Dar de baja' : 'Reactivar'} confirmLabel={m.active ? 'Sí, dar de baja' : 'Sí, reactivar'} />
                            </form>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {manager && (
          <Card title="Invitar a alguien">
            <p className="mb-4 text-sm text-muted">
              Se genera un link personal válido por 7 días. La persona entra con <b>ese mismo email</b> (o crea su cuenta) y queda
              sumada con el rol elegido.
            </p>
            <InviteForm action={createInvitation} />

            {invites.length > 0 && (
              <ul className="mt-5 divide-y divide-line border-t border-line">
                {invites.map((inv) => {
                  const link = `${origin}/invitacion/${inv.token}`
                  const expired = Date.parse(inv.expires_at) <= now
                  return (
                    <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{inv.email}</p>
                        <p className="text-xs text-muted">
                          {ROLE_LABEL[inv.role]} · {expired ? 'vencida' : `vence el ${formatDate(inv.expires_at)}`}
                        </p>
                      </div>
                      {expired ? (
                        <Pill label="Vencida" className="bg-slate-100 text-slate-600 ring-slate-200" />
                      ) : (
                        <>
                          <CopyButton text={link} />
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(`Te invito a sumarte a ${clinic.name} en VetNube: ${link}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                          >
                            <MessageCircle className="size-3.5" aria-hidden />
                            WhatsApp
                          </a>
                        </>
                      )}
                      <form action={revokeInvitation.bind(null, inv.id)}>
                        <ConfirmSubmit label="Revocar" confirmLabel="Sí, revocar" />
                      </form>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        )}

        <Card title="Qué puede hacer cada rol">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ROLE_PERMISSIONS.map((r) => (
              <div key={r.role} className="rounded-lg border border-line p-3">
                <dt className="font-bold">{ROLE_LABEL[r.role]}</dt>
                <dd className="mt-1 text-sm text-muted">{r.can}</dd>
              </div>
            ))}
          </dl>
          {!owner && <p className="mt-3 text-xs text-muted">Solo el dueño/a puede cambiar roles o dar de baja miembros.</p>}
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Configuración" description={`${clinic.name} · tu rol: ${ROLE_LABEL[clinic.role]}`} />

      <nav aria-label="Secciones de configuración" className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/configuracion?tab=${t.key}`}
            aria-current={t.key === tab ? 'page' : undefined}
            className={`border-b-2 px-3 py-2.5 text-sm font-bold whitespace-nowrap ${
              t.key === tab ? 'border-brand-500 text-brand-700' : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {sp.ok && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
          {sp.ok}
        </p>
      )}
      <ErrorNotice message={sp.error} />
      {!manager && (tab === 'clinica' || tab === 'agenda') && (
        <p className="rounded-lg bg-canvas px-4 py-3 text-sm text-muted ring-1 ring-line">
          Solo el dueño/a o administración pueden modificar esta sección.
        </p>
      )}

      {content}
    </div>
  )
}
