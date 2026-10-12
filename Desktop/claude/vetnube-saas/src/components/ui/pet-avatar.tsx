import { SPECIES } from '@/lib/labels'
import type { Species } from '@/lib/types'

export function PetAvatar({ name, species }: { name: string; species: Species }) {
  const style = SPECIES[species] ?? SPECIES.otro
  return (
    <span
      className={`grid size-9 shrink-0 place-items-center rounded-full font-display font-bold ${style.className}`}
      title={style.label}
    >
      {name.charAt(0).toUpperCase() || '?'}
    </span>
  )
}
