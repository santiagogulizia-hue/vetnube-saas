import Link from 'next/link'
import { CalendarClock, PackageX } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function InventoryAlerts({ lowStock, expiring }: { lowStock: number; expiring: number }) {
  if (lowStock === 0 && expiring === 0) return null

  return (
    <Card
      title="Inventario"
      action={
        <Link href="/inventario" className="text-sm font-bold text-brand-600 hover:underline">
          Revisar
        </Link>
      }
    >
      <ul className="space-y-2 text-sm">
        {lowStock > 0 && (
          <li className="flex items-center gap-2 font-semibold text-amber-700">
            <PackageX className="size-4" aria-hidden />
            {lowStock} {lowStock === 1 ? 'producto con stock bajo' : 'productos con stock bajo'}
          </li>
        )}
        {expiring > 0 && (
          <li className="flex items-center gap-2 font-semibold text-rose-700">
            <CalendarClock className="size-4" aria-hidden />
            {expiring} {expiring === 1 ? 'lote vence' : 'lotes vencen'} en los próximos 30 días
          </li>
        )}
      </ul>
    </Card>
  )
}
