'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { inputClass } from '@/components/forms/fields'
import { AGENDA_VIEWS, type AgendaView, agendaHref } from '@/lib/agenda'
import type { StaffMember } from '@/lib/staff'

type Props = {
  view: AgendaView
  day: string
  prevDay: string
  nextDay: string
  today: string
  title: string
  vet?: string
  vets: StaffMember[]
}

/** Barra de la agenda: vista, navegación de fechas y filtro por profesional. Todo vive en la URL. */
export function AgendaControls({ view, day, prevDay, nextDay, today, title, vet, vets }: Props) {
  const router = useRouter()
  const nav = 'grid size-9 place-items-center rounded-lg border border-line bg-white hover:border-brand-500'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Link href={agendaHref({ vista: view, fecha: prevDay, vet })} className={nav} aria-label="Anterior">
          <ChevronLeft className="size-4" />
        </Link>
        <Link href={agendaHref({ vista: view, fecha: today, vet })} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold hover:border-brand-500">
          Hoy
        </Link>
        <Link href={agendaHref({ vista: view, fecha: nextDay, vet })} className={nav} aria-label="Siguiente">
          <ChevronRight className="size-4" />
        </Link>
      </div>

      <h2 className="min-w-0 flex-1 font-display text-xl font-bold">{title}</h2>

      <input
        type="date"
        aria-label="Ir a la fecha"
        value={day}
        onChange={(e) => e.target.value && router.push(agendaHref({ vista: view, fecha: e.target.value, vet }))}
        className={`${inputClass} w-auto`}
      />

      {vets.length > 0 && (
        <select
          aria-label="Filtrar por profesional"
          value={vet ?? ''}
          onChange={(e) => router.push(agendaHref({ vista: view, fecha: day, vet: e.target.value || undefined }))}
          className={`${inputClass} w-auto`}
        >
          <option value="">Todos los profesionales</option>
          {vets.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      )}

      <div role="tablist" aria-label="Vista" className="flex rounded-lg border border-line bg-white p-0.5">
        {AGENDA_VIEWS.map((v) => (
          <Link
            key={v.key}
            role="tab"
            aria-selected={v.key === view}
            href={agendaHref({ vista: v.key, fecha: day, vet })}
            className={`rounded-md px-3 py-1.5 text-sm font-bold ${v.key === view ? 'bg-brand-600 text-white' : 'text-muted hover:text-fg'}`}
          >
            {v.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
