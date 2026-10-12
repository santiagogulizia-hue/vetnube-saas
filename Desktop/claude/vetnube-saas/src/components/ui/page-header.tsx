import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type Props = {
  title: string
  description?: string
  back?: { href: string; label: string }
  actions?: React.ReactNode
}

export function PageHeader({ title, description, back, actions }: Props) {
  return (
    <div className="space-y-2">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-brand-600">
          <ChevronLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold text-balance">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}
