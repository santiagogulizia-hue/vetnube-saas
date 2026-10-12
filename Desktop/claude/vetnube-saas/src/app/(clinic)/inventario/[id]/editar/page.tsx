import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductForm } from '@/components/inventory/product-form'
import { PageHeader } from '@/components/ui/page-header'
import { requireClinic } from '@/lib/clinic'
import type { Product } from '@/lib/types'
import { updateProduct } from '../../actions'

export const metadata: Metadata = { title: 'Editar producto' }

export default async function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, clinic } = await requireClinic()
  const { data } = await supabase.from('products').select('*').eq('id', id).eq('clinic_id', clinic.id).maybeSingle()
  if (!data) notFound()
  const product = data as Product

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={`Editar ${product.name}`} back={{ href: `/inventario/${id}`, label: 'Ficha del producto' }} />
      <ProductForm
        action={updateProduct.bind(null, id)}
        product={product}
        currency={clinic.currency}
        cancelHref={`/inventario/${id}`}
        submitLabel="Guardar cambios"
      />
    </div>
  )
}
