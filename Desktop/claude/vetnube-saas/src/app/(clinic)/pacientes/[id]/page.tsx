import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileImage, FileText, Stethoscope, Syringe, Trash2 } from 'lucide-react'
import { ConfirmSubmit } from '@/components/forms/buttons'
import { AttachmentUploader } from '@/components/pets/attachment-uploader'
import { MedicalRecordCard } from '@/components/pets/medical-record-card'
import { PetHeader } from '@/components/pets/pet-header'
import { WeightChart } from '@/components/pets/weight-chart'
import { ErrorNotice } from '@/components/ui/notice'
import { requireClinic } from '@/lib/clinic'
import { addDays, formatBytes, formatDate, formatDateTime, toLocalInput, todayIn } from '@/lib/format'
import { IMMUNIZATION_KIND } from '@/lib/labels'
import { canDelete, canWriteClinical } from '@/lib/permissions'
import { signFiles } from '@/lib/storage'
import type { Attachment, Clinic, Immunization, MedicalRecord, Pet } from '@/lib/types'
import type { ServerSupabase } from '@/lib/supabase/server'
import { deleteAttachment, deleteImmunization, deleteMedicalRecord } from './clinical-actions'

export const metadata: Metadata = { title: 'Ficha del paciente' }

const TABS = [
  { key: 'historia', label: 'Historia clínica' },
  { key: 'vacunas', label: 'Vacunas y desparasitaciones' },
  { key: 'peso', label: 'Curva de peso' },
  { key: 'archivos', label: 'Archivos' },
] as const
type Tab = (typeof TABS)[number]['key']

type PetWithClient = Pet & { client: { id: string; first_name: string; last_name: string; phone: string | null } | null }
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; error?: string }> }

/** Fecha local (YYYY-MM-DD) de un timestamp, en la zona de la clínica. */
const localDay = (iso: string, timeZone: string) => toLocalInput(iso, timeZone).slice(0, 10)

export default async function PacientePage({ params, searchParams }: Props) {
  const [{ id }, { tab: tabParam, error }] = await Promise.all([params, searchParams])
  const tab: Tab = TABS.some((t) => t.key === tabParam) ? (tabParam as Tab) : 'historia'
  const { supabase, clinic } = await requireClinic()

  const { data } = await supabase
    .from('pets')
    .select('*, client:clients(id, first_name, last_name, phone)')
    .eq('id', id)
    .eq('clinic_id', clinic.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!data) notFound()
  const pet = data as unknown as PetWithClient

  const [{ data: last }, { data: due }] = await Promise.all([
    supabase.from('medical_records').select('visit_at').eq('pet_id', id).order('visit_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('v_immunizations_due').select('name, next_due_on').eq('pet_id', id).order('next_due_on').limit(1).maybeSingle(),
  ])
  const today = todayIn(clinic.timezone)

  return (
    <div className="space-y-5">
      <Link href="/pacientes" className="text-sm font-bold text-muted hover:text-brand-600">
        ‹ Pacientes
      </Link>

      <PetHeader
        pet={pet}
        client={pet.client}
        clinicName={clinic.name}
        lastVisit={last ? localDay(last.visit_at as string, clinic.timezone) : null}
        nextDue={due ? { name: due.name as string, next_due_on: due.next_due_on as string, overdue: (due.next_due_on as string) < today } : null}
        canWrite={canWriteClinical(clinic.role)}
      />

      <ErrorNotice message={error} />

      <section className="rounded-xl border border-line bg-white shadow-sm">
        <nav aria-label="Secciones de la ficha" className="flex gap-1 overflow-x-auto border-b border-line px-3">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/pacientes/${id}?tab=${t.key}`}
              aria-current={t.key === tab ? 'page' : undefined}
              className={`border-b-2 px-3 py-3 text-sm font-bold whitespace-nowrap transition-colors ${
                t.key === tab ? 'border-brand-500 text-brand-700' : 'border-transparent text-muted hover:text-fg'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="p-5">
          {tab === 'historia' && <HistoryTab supabase={supabase} clinic={clinic} pet={pet} />}
          {tab === 'vacunas' && <ImmunizationsTab supabase={supabase} clinic={clinic} petId={id} today={today} />}
          {tab === 'peso' && <WeightTab supabase={supabase} clinic={clinic} petId={id} />}
          {tab === 'archivos' && <FilesTab supabase={supabase} clinic={clinic} petId={id} />}
        </div>
      </section>
    </div>
  )
}

type TabProps = { supabase: ServerSupabase; clinic: Clinic }

async function HistoryTab({ supabase, clinic, pet }: TabProps & { pet: Pet }) {
  const [{ data: recordsData }, { data: filesData }] = await Promise.all([
    supabase
      .from('medical_records')
      .select('*, vet:profiles!medical_records_vet_id_fkey(full_name)')
      .eq('pet_id', pet.id)
      .order('visit_at', { ascending: false }),
    supabase.from('attachments').select('id, file_name, storage_path, medical_record_id').eq('pet_id', pet.id).not('medical_record_id', 'is', null),
  ])
  const records = (recordsData ?? []) as unknown as MedicalRecord[]
  const files = (filesData ?? []) as Pick<Attachment, 'id' | 'file_name' | 'storage_path' | 'medical_record_id'>[]
  const urls = await signFiles(supabase, files.map((f) => f.storage_path))
  const canWrite = canWriteClinical(clinic.role)

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Stethoscope className="size-8 text-ink-400" aria-hidden />
        <p className="font-semibold">Todavía no hay consultas registradas.</p>
        {canWrite && !pet.deceased_at && (
          <Link href={`/pacientes/${pet.id}/consultas/nueva`} className="text-sm font-bold text-brand-600 hover:underline">
            Registrar la primera consulta
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="ml-1.5">
      {records.map((r) => (
        <MedicalRecordCard
          key={r.id}
          record={r}
          timeZone={clinic.timezone}
          files={files
            .filter((f) => f.medical_record_id === r.id)
            .map((f) => ({ id: f.id, file_name: f.file_name, url: urls.get(f.storage_path) ?? null }))}
          editHref={canWrite ? `/pacientes/${pet.id}/consultas/${r.id}/editar` : null}
          deleteAction={canDelete(clinic.role) ? deleteMedicalRecord.bind(null, pet.id, r.id) : null}
        />
      ))}
    </div>
  )
}

async function ImmunizationsTab({ supabase, clinic, petId, today }: TabProps & { petId: string; today: string }) {
  const { data } = await supabase
    .from('immunizations')
    .select('*, vet:profiles!immunizations_vet_id_fkey(full_name)')
    .eq('pet_id', petId)
    .order('applied_on', { ascending: false })
  const items = (data ?? []) as unknown as Immunization[]

  // Solo la aplicación más reciente de cada producto define el estado del recordatorio
  const seen = new Set<string>()
  const rows = items.map((i) => {
    const key = `${i.kind}|${i.name.toLowerCase()}`
    const latest = !seen.has(key)
    seen.add(key)
    let status: { label: string; className: string } | null = null
    if (i.next_due_on) {
      if (!latest) status = { label: 'Renovada', className: 'bg-slate-100 text-slate-600 ring-slate-200' }
      else if (i.next_due_on < today) status = { label: 'Vencida', className: 'bg-rose-50 text-rose-700 ring-rose-200' }
      else if (i.next_due_on <= addDays(today, 30)) status = { label: 'Próxima', className: 'bg-amber-50 text-amber-700 ring-amber-200' }
      else status = { label: 'Al día', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
    }
    return { ...i, status }
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href={`/pacientes/${petId}/vacunas/nueva`} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:underline">
          <Syringe className="size-4" aria-hidden />
          Registrar aplicación
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Sin vacunas ni desparasitaciones registradas.</p>
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wider text-muted uppercase">
                <th className="px-5 py-2 font-bold">Aplicada</th>
                <th className="px-5 py-2 font-bold">Producto</th>
                <th className="px-5 py-2 font-bold">Lote</th>
                <th className="px-5 py-2 font-bold">Próxima dosis</th>
                <th className="px-5 py-2 font-bold">Estado</th>
                <th className="px-5 py-2">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((i) => (
                <tr key={i.id}>
                  <td className="px-5 py-3 tabular-nums">{formatDate(i.applied_on)}</td>
                  <td className="px-5 py-3">
                    <p className="font-bold">{i.name}</p>
                    <p className="text-xs text-muted">
                      {IMMUNIZATION_KIND[i.kind]}
                      {i.vet?.full_name && ` · ${i.vet.full_name}`}
                    </p>
                  </td>
                  <td className="px-5 py-3">{i.batch_number ?? '—'}</td>
                  <td className="px-5 py-3 tabular-nums">{formatDate(i.next_due_on)}</td>
                  <td className="px-5 py-3">
                    {i.status ? (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${i.status.className}`}>{i.status.label}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/pacientes/${petId}/vacunas/${i.id}/editar`} className="text-sm font-bold text-brand-600 hover:underline">
                        Editar
                      </Link>
                      {canDelete(clinic.role) && (
                        <form action={deleteImmunization.bind(null, petId, i.id)}>
                          <ConfirmSubmit label={<Trash2 className="size-4" aria-label="Borrar" />} confirmLabel="Borrar" />
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

async function WeightTab({ supabase, clinic, petId }: TabProps & { petId: string }) {
  const { data } = await supabase
    .from('medical_records')
    .select('visit_at, weight_kg')
    .eq('pet_id', petId)
    .not('weight_kg', 'is', null)
    .order('visit_at')
  const points = (data ?? []).map((r) => ({ date: localDay(r.visit_at as string, clinic.timezone), kg: Number(r.weight_kg) }))

  return (
    <div className="space-y-5">
      <WeightChart points={points} />
      {points.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-6">
          {[...points].reverse().map((p, i) => (
            <li key={`${p.date}-${i}`} className="rounded-lg border border-line px-3 py-2">
              <p className="text-xs text-muted">{formatDate(p.date)}</p>
              <p className="font-bold tabular-nums">{p.kg} kg</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

async function FilesTab({ supabase, clinic, petId }: TabProps & { petId: string }) {
  const [{ data: filesData }, { data: recordsData }] = await Promise.all([
    supabase
      .from('attachments')
      .select('*, record:medical_records(visit_at, reason)')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false }),
    supabase.from('medical_records').select('id, visit_at, reason').eq('pet_id', petId).order('visit_at', { ascending: false }).limit(30),
  ])
  const files = (filesData ?? []) as unknown as (Attachment & { record: { visit_at: string; reason: string } | null })[]
  const urls = await signFiles(supabase, files.map((f) => f.storage_path))
  const records = (recordsData ?? []).map((r) => ({
    id: r.id as string,
    label: `${formatDate(localDay(r.visit_at as string, clinic.timezone))} · ${r.reason as string}`,
  }))

  return (
    <div className="space-y-4">
      <AttachmentUploader clinicId={clinic.id} petId={petId} records={records} />
      {files.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Todavía no hay archivos adjuntos.</p>
      ) : (
        <ul className="divide-y divide-line">
          {files.map((f) => {
            const Icon = f.mime_type?.startsWith('image/') ? FileImage : FileText
            const url = urls.get(f.storage_path)
            return (
              <li key={f.id} className="flex items-center gap-3 py-3">
                <Icon className="size-5 shrink-0 text-brand-600" aria-hidden />
                <div className="min-w-0 flex-1">
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="block truncate font-bold hover:text-brand-600">
                      {f.file_name}
                    </a>
                  ) : (
                    <p className="truncate font-bold">{f.file_name}</p>
                  )}
                  <p className="truncate text-xs text-muted">
                    {formatBytes(f.size_bytes)} · subido el {formatDateTime(f.created_at, clinic.timezone)}
                    {f.record && ` · ${f.record.reason}`}
                  </p>
                </div>
                {canDelete(clinic.role) && (
                  <form action={deleteAttachment.bind(null, petId, f.id)}>
                    <ConfirmSubmit label={<Trash2 className="size-4" aria-label={`Borrar ${f.file_name}`} />} confirmLabel="Borrar" />
                  </form>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
