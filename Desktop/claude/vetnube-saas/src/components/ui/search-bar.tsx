import { Search } from 'lucide-react'
import { inputClass } from '@/components/forms/fields'

/** Buscador por GET: el término queda en la URL (?q=) y se puede compartir o recargar. */
export function SearchBar({
  placeholder,
  defaultValue,
  children,
}: {
  placeholder: string
  defaultValue?: string
  children?: React.ReactNode
}) {
  return (
    <form role="search" className="flex min-w-0 flex-1 flex-wrap gap-2">
      <div className="relative min-w-56 flex-1 sm:max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={placeholder}
          className={`${inputClass} pl-9`}
        />
      </div>
      {children}
      <button className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold hover:border-brand-500">Buscar</button>
    </form>
  )
}
