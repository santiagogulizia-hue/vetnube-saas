import type { Metadata } from 'next'
import { PosTerminal, type PosProduct } from '@/components/pos/pos-terminal'
import { PageHeader } from '@/components/ui/page-header'
import { requireClinic } from '@/lib/clinic'
import { fullName } from '@/lib/format'
import { getOpenCashSession } from '@/lib/sales'
import type { Product } from '@/lib/types'

export const metadata: Metadata = { title: 'Nueva venta' }

type ClientRow = { id: string; first_name: string; last_name: string; document_id: string | null; phone: string | null }

export default async function NuevaVentaPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams
  const { supabase, clinic } = await requireClinic()

  const [{ data: productsData }, { data: clientsData }, { data: balancesData }, session] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, sku, barcode, category, price, stock, is_service, unit')
      .eq('clinic_id', clinic.id)
      .eq('active', true)
      .order('name')
      .limit(5000),
    supabase
      .from('clients')
      .select('id, first_name, last_name, document_id, phone')
      .eq('clinic_id', clinic.id)
      .is('deleted_at', null)
      .order('last_name')
      .limit(5000),
    supabase.from('v_client_balances').select('client_id, balance').eq('clinic_id', clinic.id).gt('balance', 0),
    getOpenCashSession(supabase, clinic.id),
  ])

  const products: PosProduct[] = ((productsData ?? []) as Product[]).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    category: p.category,
    price: Number(p.price),
    stock: Number(p.stock),
    isService: p.is_service,
    unit: p.unit,
  }))
  const debt = new Map((balancesData ?? []).map((b) => [b.client_id as string, Number(b.balance)]))
  const clients = ((clientsData ?? []) as ClientRow[]).map((c) => ({
    id: c.id,
    name: fullName(c),
    document: c.document_id,
    phone: c.phone,
    balance: debt.get(c.id) ?? 0,
  }))

  return (
    <div className="space-y-5">
      <PageHeader title="Nueva venta" back={{ href: '/ventas', label: 'Ventas' }} />
      <PosTerminal
        products={products}
        clients={clients}
        currency={clinic.currency}
        cashOpen={Boolean(session)}
        initialClientId={clients.some((c) => c.id === cliente) ? (cliente as string) : null}
      />
    </div>
  )
}
