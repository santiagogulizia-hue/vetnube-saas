import Link from 'next/link'

type Props = { basePath: string; page: number; pageSize: number; total: number; params?: Record<string, string | undefined> }

export function Pagination({ basePath, page, pageSize, total, params = {} }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null

  const href = (p: number) => {
    const sp = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => v && sp.set(k, v))
    if (p > 1) sp.set('page', String(p))
    const qs = sp.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }
  const link = 'rounded-lg border border-line bg-white px-3 py-1.5 font-bold hover:border-brand-500'

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">
        Página {page} de {pages} · {total} resultados
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className={link}>
            Anterior
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className={link}>
            Siguiente
          </Link>
        )}
      </div>
    </nav>
  )
}
