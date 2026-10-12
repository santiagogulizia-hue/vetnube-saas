import type { Metadata } from 'next'
import Link from 'next/link'
import { UserPlus, Users } from 'lucide-react'
import { primaryButton } from '@/components/forms/fields'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { PetAvatar } from '@/components/ui/pet-avatar'
import { SearchBar } from '@/components/ui/search-bar'
import { requireClinic } from '@/lib/clinic'
import { cleanSearch } from '@/lib/form'
import { formatMoney } from '@/lib/format'
import type { Client, Pet } from '@/lib/types'

export const metadata: Metadata = { title: 'Clientes' }

const PAGE_SIZE = 25

type Row = Pick<Client, 'id' | 'first_name' | 'last_name' | 'document_id' | 'phone' | 'email'> & {
  pets: (Pick<Pet, 'id' | 'name' | 'species' | 'deceased_at'> & { deleted_at: string | null })[]
}

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q, page: pageParam } = await searchParams
  const { supabase, clinic } = await requireClinic()
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)
  const term = cleanSearch(q)

  let query = supabase
    .from('clients')
    .select('id, first_name, last_name, document_id, phone, email, pets(id, name, species, deceased_at, deleted_at)', {
      count: 'exact',
    })
    .eq('clinic_id', clinic.id)
    .is('deleted_at', null)
    .order('last_name')
    .order('first_name')
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (term) {
    // También encuentra al tutor por el nombre de su mascota
    const { data: petMatches } = await supabase
      .from('pets')
      .select('client_id')
      .eq('clinic_id', clinic.id)
      .ilike('name', `%${term}%`)
      .limit(50)
    const ids = [...new Set((petMatches ?? []).map((p) => p.client_id as string))]
    const like = `%${term}%`
    const filters = [
      `first_name.ilike.${like}`,
      `last_name.ilike.${like}`,
      `document_id.ilike.${like}`,
      `phone.ilike.${like}`,
      `email.ilike.${like}`,
    ]
    if (ids.length) filters.push(`id.in.(${ids.join(',')})`)
    query = query.or(filters.join(','))
  }

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as Row[]

  // Saldos de cuenta corriente de los clientes de esta página
  const { data: balances } = rows.length
    ? await supabase.from('v_client_balances').select('client_id, balance').in('client_id', rows.map((r) => r.id)).gt('balance', 0)
    : { data: [] }
  const debt = new Map((balances ?? []).map((b) => [b.client_id as string, Number(b.balance)]))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        description="Tutores de los pacientes, con sus datos de contacto y cuenta corriente."
        actions={
          <Link href="/clientes/nuevo" className={primaryButton}>
            <UserPlus className="size-4" aria-hidden />
            Nuevo cliente
          </Link>
        }
      />

      <SearchBar placeholder="Buscar por nombre, DNI, teléfono, email o mascota" defaultValue={q} />

      <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <Users className="size-8 text-ink-400" aria-hidden />
            <p className="font-semibold">{term ? 'Ningún cliente coincide con la búsqueda.' : 'Todavía no hay clientes cargados.'}</p>
            {!term && (
              <Link href="/clientes/nuevo" className="text-sm font-bold text-brand-600 hover:underline">
                Cargar el primer cliente
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs tracking-wider text-muted uppercase">
                  <th className="px-5 py-3 font-bold">Cliente</th>
                  <th className="px-5 py-3 font-bold">Contacto</th>
                  <th className="px-5 py-3 font-bold">Mascotas</th>
                  <th className="px-5 py-3 text-right font-bold">Cuenta corriente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((c) => {
                  const pets = c.pets.filter((p) => !p.deleted_at)
                  const balance = debt.get(c.id)
                  return (
                    <tr key={c.id} className="relative hover:bg-canvas/60">
                      <td className="px-5 py-3">
                        <Link href={`/clientes/${c.id}`} className="font-bold after:absolute after:inset-0 hover:text-brand-600">
                          {`${c.last_name}${c.last_name ? ', ' : ''}${c.first_name}`}
                        </Link>
                        {c.document_id && <p className="text-xs text-muted">DNI {c.document_id}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <p>{c.phone ?? '—'}</p>
                        {c.email && <p className="text-xs text-muted">{c.email}</p>}
                      </td>
                      <td className="px-5 py-3">
                        {pets.length === 0 ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            {pets.slice(0, 4).map((p) => (
                              <span key={p.id} className={`inline-flex items-center gap-1.5 ${p.deceased_at ? 'opacity-50' : ''}`}>
                                <PetAvatar name={p.name} species={p.species} />
                                <span className="font-semibold">{p.name}</span>
                              </span>
                            ))}
                            {pets.length > 4 && <span className="text-xs text-muted">+{pets.length - 4}</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {balance ? (
                          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200 ring-inset">
                            Debe {formatMoney(balance, clinic.currency)}
                          </span>
                        ) : (
                          <span className="text-muted">Al día</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Pagination basePath="/clientes" page={page} pageSize={PAGE_SIZE} total={count ?? 0} params={{ q: term || undefined }} />
    </div>
  )
}
