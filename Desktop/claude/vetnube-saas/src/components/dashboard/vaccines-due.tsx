import { MessageCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PetAvatar } from '@/components/ui/pet-avatar'
import { formatShortDate, whatsappLink } from '@/lib/format'
import type { DueImmunization } from '@/lib/types'

function dueLabel(days: number) {
  if (days < 0) return { text: `Venció hace ${-days} d`, className: 'bg-rose-50 text-rose-700 ring-rose-200' }
  if (days === 0) return { text: 'Vence hoy', className: 'bg-amber-50 text-amber-700 ring-amber-200' }
  return { text: `En ${days} d`, className: 'bg-amber-50 text-amber-700 ring-amber-200' }
}

export function VaccinesDue({ items, clinicName }: { items: DueImmunization[]; clinicName: string }) {
  return (
    <Card title="Vacunas y desparasitaciones" action={<span className="text-xs text-muted">vencidas y próximos 7 días</span>}>
      {items.length === 0 ? (
        <p className="py-4 text-sm text-muted">No hay dosis vencidas ni por vencer esta semana.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => {
            const due = dueLabel(item.days_left)
            const firstName = item.client_name.split(' ')[0]
            const wa = whatsappLink(
              item.phone,
              `Hola ${firstName}, te escribimos de ${clinicName}. ${item.pet_name} tiene pendiente la dosis de ${item.name} (${formatShortDate(item.next_due_on)}). ¿Querés que te reservemos un turno?`,
            )
            return (
              <li key={item.immunization_id} className="flex items-center gap-3 py-3">
                <PetAvatar name={item.pet_name} species={item.species} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{item.pet_name}</p>
                  <p className="truncate text-sm text-muted">
                    {item.name} · {item.client_name}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${due.className}`}>
                  {due.text}
                </span>
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-muted hover:border-emerald-300 hover:text-emerald-600"
                    aria-label={`Avisar por WhatsApp a ${item.client_name}`}
                    title="Avisar por WhatsApp"
                  >
                    <MessageCircle className="size-4" />
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
