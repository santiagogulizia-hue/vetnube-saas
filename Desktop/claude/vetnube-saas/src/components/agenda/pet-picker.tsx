'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { inputClass } from '@/components/forms/fields'
import { PetAvatar } from '@/components/ui/pet-avatar'
import type { Species } from '@/lib/types'

export type PetOption = { id: string; name: string; species: Species; tutor: string; phone: string | null }

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Buscador de paciente por nombre de la mascota, del tutor o teléfono. Envía `pet_id`. */
export function PetPicker({ pets, defaultId, error }: { pets: PetOption[]; defaultId?: string; error?: string }) {
  const [selected, setSelected] = useState<PetOption | null>(pets.find((p) => p.id === defaultId) ?? null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const matches = useMemo(() => {
    const q = normalize(query.trim())
    const list = q ? pets.filter((p) => normalize(`${p.name} ${p.tutor} ${p.phone ?? ''}`).includes(q)) : pets
    return list.slice(0, 8)
  }, [pets, query])

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2">
        <input type="hidden" name="pet_id" value={selected.id} />
        <PetAvatar name={selected.name} species={selected.species} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{selected.name}</p>
          <p className="truncate text-xs text-muted">
            {selected.tutor}
            {selected.phone && ` · ${selected.phone}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelected(null)
            setQuery('')
          }}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-muted hover:bg-white hover:text-fg"
        >
          <X className="size-3.5" aria-hidden />
          Cambiar
        </button>
      </div>
    )
  }

  const choose = (p: PetOption) => {
    setSelected(p)
    setOpen(false)
  }

  return (
    <div className="relative">
      <input type="hidden" name="pet_id" value="" />
      <input
        id="pet_search"
        role="combobox"
        aria-expanded={open}
        aria-controls="pet-options"
        aria-autocomplete="list"
        aria-invalid={error ? true : undefined}
        autoComplete="off"
        value={query}
        placeholder="Buscá por mascota, tutor o teléfono"
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
          } else if (e.key === 'Enter' && open && matches[active]) {
            e.preventDefault()
            choose(matches[active])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        className={inputClass}
      />
      {open && (
        <ul id="pet-options" role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-lg">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">Sin resultados. Cargá el paciente desde Clientes.</li>
          ) : (
            matches.map((p, i) => (
              <li key={p.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(p)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left ${i === active ? 'bg-brand-50' : 'hover:bg-canvas'}`}
                >
                  <PetAvatar name={p.name} species={p.species} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{p.name}</span>
                    <span className="block truncate text-xs text-muted">{p.tutor}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
