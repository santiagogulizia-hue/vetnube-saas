import { PawPrint } from 'lucide-react'

export function BrandLogo({ subtitle, dark = false }: { subtitle?: string; dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-400 text-ink-900">
        <PawPrint className="size-6" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className={`font-display text-lg leading-tight font-bold ${dark ? 'text-white' : 'text-fg'}`}>VetNube</p>
        {subtitle && <p className={`truncate text-xs ${dark ? 'text-ink-400' : 'text-muted'}`}>{subtitle}</p>}
      </div>
    </div>
  )
}
