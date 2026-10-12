import Link from 'next/link'
import { CalendarPlus, ShoppingCart, Stethoscope, UserPlus } from 'lucide-react'
import { Card } from '@/components/ui/card'

const ACTIONS = [
  { href: '/agenda/nuevo', label: 'Nuevo turno', icon: CalendarPlus },
  { href: '/pacientes', label: 'Nueva consulta', icon: Stethoscope },
  { href: '/clientes/nuevo', label: 'Nuevo cliente', icon: UserPlus },
  { href: '/ventas/nueva', label: 'Nueva venta', icon: ShoppingCart },
]

export function QuickActions() {
  return (
    <Card title="Accesos rápidos">
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-2.5 rounded-lg border border-line bg-canvas/60 px-3 py-3 text-sm font-bold transition-colors hover:border-brand-500 hover:bg-brand-50"
          >
            <Icon className="size-5 shrink-0 text-brand-600" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </Card>
  )
}
