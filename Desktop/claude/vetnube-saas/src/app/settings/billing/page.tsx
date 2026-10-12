import { redirect } from 'next/navigation'

/** Ruta anterior de facturación: ahora vive en Configuración → Plan y facturación. */
export default function LegacyBillingPage() {
  redirect('/configuracion?tab=plan')
}
