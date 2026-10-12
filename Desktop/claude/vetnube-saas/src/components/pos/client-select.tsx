'use client'

import { useMemo, useState } from 'react'
import { UserRound, X } from 'lucide-react'
import { inputClass } from '@/components/forms/fields'

export type ClientOption = { id: string; name: string; document: string | null; phone: string | null; balance: number }

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

type Props = {
  clients: ClientOption[]
  value: string | null
  onChange: (id: string | null) => void
  formatMoney: (n: number) => string
}

/** Selector de cliente controlado para el punto de venta (opcional: "Consumidor final"). */
export function ClientSelect({ clients, value, onChange, formatMoney }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const selected = clients.find((c) => c.id === value) ?? null

  const matches = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return clients.slice(0, 8)
    return clients.filter((c) => normalize(`${c.name} ${c.document ?? ''} ${c.phone ?? ''}`).includes(q)).slice(0, 8)
  }, [clients, query])

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2">
        <UserRound className="size-5 shrink-0 text-brand-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{selected.name}</p>
          <p className="truncate text-xs text-muted">
            {selected.balance > 0 ? <span className="font-bold text-rose-700">Debe {formatMoney(selected.balance)}</span> : 'Cuenta al día'}
          </p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="rounded-md p-1 text-muted hover:bg-white hover:text-fg" aria-label="Quitar cliente">
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        id="pos_client"
        role="combobox"
        aria-expanded={open}
        aria-controls="pos-client-options"
        autoComplete="off"
        value={query}
        placeholder="Consumidor final · buscar cliente"
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => Math.min(i + 1, matches.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && matches[active]) {
            e.preventDefault()
            onChange(matches[active].id)
            setQuery('')
          }
        }}
        className={inputClass}
      />
      {open && matches.length > 0 && (
        <ul id="pos-client-options" role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-lg">
          {matches.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(c.id)
                  setQuery('')
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${i === active ? 'bg-brand-50' : 'hover:bg-canvas'}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-bold">{c.name}</span>
                  <span className="block truncate text-xs text-muted">{[c.document && `DNI ${c.document}`, c.phone].filter(Boolean).join(' · ')}</span>
                </span>
                {c.balance > 0 && <span className="shrink-0 text-xs font-bold text-rose-700">Debe {formatMoney(c.balance)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
