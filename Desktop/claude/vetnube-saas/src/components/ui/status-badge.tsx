import { APPOINTMENT_STATUS } from '@/lib/labels'
import type { AppointmentStatus } from '@/lib/types'

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, className } = APPOINTMENT_STATUS[status]
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${className}`}>
      {label}
    </span>
  )
}
