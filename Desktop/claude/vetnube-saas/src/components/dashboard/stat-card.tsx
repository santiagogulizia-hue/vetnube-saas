import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type Props = {
  label: string
  value: string | number
  detail?: string
  icon: LucideIcon
  href?: string
  tone?: 'default' | 'alert'
}

export function StatCard({ label, value, detail, icon: Icon, href, tone = 'default' }: Props) {
  const alert = tone === 'alert'
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold tracking-wider text-muted uppercase">{label}</span>
        <span
          className={`grid size-9 place-items-center rounded-lg ${alert ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600'}`}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</p>
      {detail && <p className={`mt-1 text-sm ${alert ? 'font-semibold text-rose-600' : 'text-muted'}`}>{detail}</p>}
    </>
  )

  const base = 'block rounded-xl border border-line bg-white p-5 shadow-sm'
  return href ? (
    <Link href={href} className={`${base} transition-colors hover:border-brand-500`}>
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  )
}
