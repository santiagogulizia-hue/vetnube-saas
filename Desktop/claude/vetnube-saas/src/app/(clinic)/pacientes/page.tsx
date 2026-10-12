import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, PawPrint, Plus } from 'lucide-react'
import { inputClass, primaryButton } from '@/components/forms/fields'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { PetAvatar } from '@/components/ui/pet-avatar'
import { SearchBar } from '@/components/ui/search-bar'
import { requireClinic } from '@/lib/clinic'
import { cleanSearch } from '@/lib/form'
import { fullName, petAge } from '@/lib/format'
import { PET_SEX, SPECIES, options } from '@/lib/labels'
import type { Pet, Species } from '@/lib/types'

export const metadata: Metadata = { title: 'Pacientes' }

const PAGE_SIZE = 25

type Row = Pet & { client: { id: string; first_name: string; last_name: string; phone: string | null } | null }
type Props = { searchParams: Promise<{ q?: string; especie?: string; page?: string }> }

export default async function PacientesPage({ searchParams }: Props) {
  const { q, especie, page: pageParam } = await searchParams
  const { supabase, clinic } = await requireClinic()
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)
  const term = cleanSearch(q)
  const species = especie && especie in SPECIES ? (especie as Species) : undefined

  let query = supabase
    .from('pets')
    .select('*, client:clients(id, first_name, last_name, phone)', { count: 'exact' })
    .eq('clinic_id', clinic.id)
    .is('deleted_at', null)
    .order('deceased_at', { nullsFirst: true })
    .order('name')
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (species) query = query.eq('species', species)
  if (term) {
    // También encuentra al paciente por el nombre, DNI o teléfono del tutor
    const like = `%${term}%`
    const { data: clientMatches } = await supabase
      .from('clients')
      .select('id')
      .eq('clinic_id', clinic.id)
      .or(`first_name.ilike.${like},last_name.ilike.${like},document_id.ilike.${like},phone.ilike.${like}`)
      .limit(50)
    const filters = [`name.ilike.${like}`, `breed.ilike.${like}`, `microchip.ilike.${like}`]
    const ids = (clientMatches ?? []).map((c) => c.id as string)
    if (ids.length) filters.push(`client_id.in.(${ids.join(',')})`)
    query = query.or(filters.join(','))
  }

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as Row[]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pacientes"
        description="Fichas de las mascotas con su historia clínica, vacunas y archivos."
        actions={
          <Link href="/pacientes/nuevo" className={primaryButton}>
            <Plus className="size-4" aria-hidden />
            Nuevo paciente
          </Link>
        }
      />

      <SearchBar placeholder="Buscar por nombre, raza, microchip o tutor" defaultValue={q}>
        <select name="especie" defaultValue={species ?? ''} aria-label="Filtrar por especie" className={`${inputClass} w-auto`}>
          <option value="">Todas las especies</option>
          {options(SPECIES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </SearchBar>

      <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <PawPrint className="size-8 text-ink-400" aria-hidden />
            <p className="font-semibold">
              {term || species ? 'Ningún paciente coincide con la búsqueda.' : 'Todavía no hay pacientes cargados.'}
            </p>
            {!term && !species && (
              <p className="text-sm text-muted">
                Primero cargá al <Link href="/clientes/nuevo" className="font-bold text-brand-600 hover:underline">cliente (tutor)</Link> y
                desde su ficha agregá la mascota.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs tracking-wider text-muted uppercase">
                  <th className="px-5 py-3 font-bold">Paciente</th>
                  <th className="px-5 py-3 font-bold">Edad</th>
                  <th className="px-5 py-3 font-bold">Sexo</th>
                  <th className="px-5 py-3 text-right font-bold">Peso</th>
                  <th className="px-5 py-3 font-bold">Tutor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => (
                  <tr key={p.id} className={`relative hover:bg-canvas/60 ${p.deceased_at ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <PetAvatar name={p.name} species={p.species} />
                        <div className="min-w-0">
                          <Link href={`/pacientes/${p.id}`} className="font-bold after:absolute after:inset-0 hover:text-brand-600">
                            {p.name}
                          </Link>
                          <p className="text-xs text-muted">{[SPECIES[p.species].label, p.breed].filter(Boolean).join(' · ')}</p>
                        </div>
                        {p.allergies && (
                          <AlertTriangle className="size-4 shrink-0 text-rose-600" aria-label={`Alergias: ${p.allergies}`} />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">{p.deceased_at ? 'Fallecido' : petAge(p.birth_date) ?? '—'}</td>
                    <td className="px-5 py-3">
                      {PET_SEX[p.sex]}
                      {p.neutered && <p className="text-xs text-muted">Castrado/a</p>}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{p.weight_kg ? `${p.weight_kg} kg` : '—'}</td>
                    <td className="px-5 py-3">
                      <p className="font-semibold">{fullName(p.client) || '—'}</p>
                      {p.client?.phone && <p className="text-xs text-muted">{p.client.phone}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Pagination
        basePath="/pacientes"
        page={page}
        pageSize={PAGE_SIZE}
        total={count ?? 0}
        params={{ q: term || undefined, especie: species }}
      />
    </div>
  )
}
