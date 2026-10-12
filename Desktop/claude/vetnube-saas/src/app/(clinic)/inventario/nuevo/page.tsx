import type { Metadata } from 'next'
import { ProductForm } from '@/components/inventory/product-form'
import { PageHeader } from '@/components/ui/page-header'
import { requireClinic } from '@/lib/clinic'
import { createProduct } from '../actions'

export const metadata: Metadata = { title: 'Nuevo producto' }

export default async function NuevoProductoPage() {
  const { clinic } = await requireClinic()
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Nuevo producto o servicio" back={{ href: '/inventario', label: 'Inventario' }} />
      <ProductForm action={createProduct} isNew currency={clinic.currency} cancelHref="/inventario" submitLabel="Guardar producto" />
    </div>
  )
}
