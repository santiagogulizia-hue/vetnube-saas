import { AlertTriangle } from 'lucide-react'

/** Recordatorio de alergias y enfermedades crónicas arriba de los formularios clínicos. */
export function ClinicalAlerts({ allergies, chronic }: { allergies: string | null; chronic: string | null }) {
  if (!allergies && !chronic) return null
  return (
    <div role="note" className="flex items-start gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        {allergies && (
          <p>
            <b>Alergias:</b> {allergies}
          </p>
        )}
        {chronic && (
          <p>
            <b>Crónico:</b> {chronic}
          </p>
        )}
      </div>
    </div>
  )
}
