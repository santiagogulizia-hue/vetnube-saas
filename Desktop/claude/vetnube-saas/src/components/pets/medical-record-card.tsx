import Link from 'next/link'
import { CalendarCheck, FileText, Pencil, Trash2 } from 'lucide-react'
import { ConfirmSubmit } from '@/components/forms/buttons'
import { formatDate, formatDateTime } from '@/lib/format'
import { RECORD_TYPE } from '@/lib/labels'
import type { MedicalRecord } from '@/lib/types'

export type SignedFile = { id: string; file_name: string; url: string | null }

type Props = {
  record: MedicalRecord
  timeZone: string
  files: SignedFile[]
  editHref: string | null
  deleteAction: (() => Promise<void>) | null
}

const TYPE_STYLE: Record<MedicalRecord['record_type'], string> = {
  consulta: 'bg-brand-50 text-brand-700',
  control: 'bg-sky-50 text-sky-700',
  cirugia: 'bg-violet-50 text-violet-700',
  urgencia: 'bg-rose-50 text-rose-700',
  internacion: 'bg-amber-50 text-amber-800',
  nota: 'bg-slate-100 text-slate-600',
}

export function MedicalRecordCard({ record: r, timeZone, files, editHref, deleteAction }: Props) {
  const vitals = [
    r.weight_kg != null && ['Peso', `${r.weight_kg} kg`],
    r.temperature_c != null && ['T°', `${r.temperature_c} °C`],
    r.heart_rate_bpm != null && ['FC', `${r.heart_rate_bpm} lpm`],
    r.respiratory_rate_rpm != null && ['FR', `${r.respiratory_rate_rpm} rpm`],
    r.mucous_membranes && ['Mucosas', r.mucous_membranes],
    r.capillary_refill_s != null && ['TLLC', `${r.capillary_refill_s} s`],
    r.body_condition_score != null && ['CC', `${r.body_condition_score}/9`],
  ].filter(Boolean) as [string, string][]

  const sections = [
    ['Anamnesis', r.anamnesis],
    ['Examen físico', r.physical_exam],
    ['Diagnóstico', r.diagnosis],
    ['Tratamiento', r.treatment],
    ['Receta / indicaciones', r.prescription],
  ].filter(([, v]) => v) as [string, string][]

  return (
    <article className="relative border-l-2 border-brand-200 pb-6 pl-6 last:pb-0">
      <span className="absolute top-1 -left-[7px] size-3 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200" aria-hidden />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
            <time dateTime={r.visit_at}>{formatDateTime(r.visit_at, timeZone)}</time>
            <span className={`rounded-full px-2 py-0.5 ${TYPE_STYLE[r.record_type]}`}>{RECORD_TYPE[r.record_type]}</span>
            {r.vet?.full_name && <span>· {r.vet.full_name}</span>}
          </p>
          <h3 className="mt-1 font-display text-lg font-bold text-balance">{r.reason}</h3>
        </div>
        <div className="flex items-center gap-2">
          {editHref && (
            <Link
              href={editHref}
              className="grid size-8 place-items-center rounded-lg border border-line text-muted hover:border-brand-500 hover:text-brand-600"
              aria-label="Editar consulta"
              title="Editar"
            >
              <Pencil className="size-4" />
            </Link>
          )}
          {deleteAction && (
            <form action={deleteAction}>
              <ConfirmSubmit label={<Trash2 className="size-4" aria-label="Borrar consulta" />} confirmLabel="Borrar" className="h-8" />
            </form>
          )}
        </div>
      </header>

      {vitals.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Signos vitales">
          {vitals.map(([label, value]) => (
            <li key={label} className="rounded-md border border-line bg-canvas px-2 py-0.5 text-xs tabular-nums">
              <span className="text-muted">{label}</span> <b>{value}</b>
            </li>
          ))}
        </ul>
      )}

      {sections.length > 0 && (
        <dl className="mt-3 space-y-2 text-sm">
          {sections.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-bold tracking-wider text-muted uppercase">{label}</dt>
              <dd className="whitespace-pre-line">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {(r.next_control_on || files.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          {r.next_control_on && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-brand-700">
              <CalendarCheck className="size-4" aria-hidden />
              Control: {formatDate(r.next_control_on)}
            </span>
          )}
          {files.map((file) =>
            file.url ? (
              <a
                key={file.id}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"
              >
                <FileText className="size-4" aria-hidden />
                {file.file_name}
              </a>
            ) : null,
          )}
        </div>
      )}
    </article>
  )
}
