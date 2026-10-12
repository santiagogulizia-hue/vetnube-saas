import Link from 'next/link'
import { AlertTriangle, CalendarPlus, HeartPulse, MessageCircle, Pencil, Plus, Syringe } from 'lucide-react'
import { primaryButton, secondaryButton } from '@/components/forms/fields'
import { formatDate, fullName, petAge, whatsappLink } from '@/lib/format'
import { PET_SEX, SPECIES } from '@/lib/labels'
import type { Pet } from '@/lib/types'

type Props = {
  pet: Pet
  client: { id: string; first_name: string; last_name: string; phone: string | null } | null
  clinicName: string
  lastVisit: string | null
  nextDue: { name: string; next_due_on: string; overdue: boolean } | null
  canWrite: boolean
}

export function PetHeader({ pet, client, clinicName, lastVisit, nextDue, canWrite }: Props) {
  const species = SPECIES[pet.species]
  const age = petAge(pet.birth_date, pet.deceased_at)
  const wa = client ? whatsappLink(client.phone, `Hola ${client.first_name}, te escribimos de ${clinicName} por ${pet.name}.`) : null

  return (
    <section className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-4">
        <span className={`grid size-16 shrink-0 place-items-center rounded-2xl font-display text-3xl font-bold ${species.className}`}>
          {pet.name.charAt(0).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-bold">{pet.name}</h2>
            {pet.deceased_at && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                Fallecido el {formatDate(pet.deceased_at)}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {[species.label, pet.breed, PET_SEX[pet.sex], pet.neutered ? 'castrado/a' : null, pet.color].filter(Boolean).join(' · ')}
          </p>
          {client && (
            <p className="mt-1 text-sm">
              Tutor:{' '}
              <Link href={`/clientes/${client.id}`} className="font-bold text-brand-600 hover:underline">
                {fullName(client)}
              </Link>
              {client.phone && <span className="text-muted"> · {client.phone}</span>}
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
                  <MessageCircle className="size-3.5" aria-hidden />
                  WhatsApp
                </a>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/pacientes/${pet.id}/editar`} className={secondaryButton}>
            <Pencil className="size-4" aria-hidden />
            Editar
          </Link>
          <Link href={`/agenda/nuevo?paciente=${pet.id}`} className={secondaryButton}>
            <CalendarPlus className="size-4" aria-hidden />
            Turno
          </Link>
          <Link href={`/pacientes/${pet.id}/vacunas/nueva`} className={secondaryButton}>
            <Syringe className="size-4" aria-hidden />
            Vacuna
          </Link>
          {canWrite && !pet.deceased_at && (
            <Link href={`/pacientes/${pet.id}/consultas/nueva`} className={primaryButton}>
              <Plus className="size-4" aria-hidden />
              Nueva consulta
            </Link>
          )}
        </div>
      </div>

      {(pet.allergies || pet.chronic_conditions) && (
        <div className="mt-4 space-y-2">
          {pet.allergies && (
            <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 ring-1 ring-rose-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              Alergias: {pet.allergies}
            </p>
          )}
          {pet.chronic_conditions && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
              <HeartPulse className="mt-0.5 size-4 shrink-0" aria-hidden />
              Crónico: {pet.chronic_conditions}
            </p>
          )}
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-3 lg:grid-cols-5">
        <Fact label="Edad">
          {age ?? '—'}
          {age && pet.birth_date_estimated && <span className="text-muted"> (aprox.)</span>}
        </Fact>
        <Fact label="Nacimiento">{formatDate(pet.birth_date)}</Fact>
        <Fact label="Peso actual">{pet.weight_kg ? `${pet.weight_kg} kg` : '—'}</Fact>
        <Fact label="Última visita">{lastVisit ? formatDate(lastVisit) : 'Sin consultas'}</Fact>
        <Fact label="Próxima dosis">
          {nextDue ? (
            <span className={nextDue.overdue ? 'font-bold text-rose-700' : ''}>
              {nextDue.name} · {formatDate(nextDue.next_due_on)}
            </span>
          ) : (
            '—'
          )}
        </Fact>
        {pet.microchip && <Fact label="Microchip">{pet.microchip}</Fact>}
      </dl>
      {pet.notes && <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-sm whitespace-pre-line text-muted">{pet.notes}</p>}
    </section>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold tracking-wider text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold break-words">{children}</dd>
    </div>
  )
}
