import type { Metadata } from 'next'
import { LandingHeader } from '@/components/landing/landing-header'
import { Faq, Features, FinalCta, Footer, Hero, HowItWorks, Pricing, Proof, Testimonials } from '@/components/landing/landing-sections'
import { TESTIMONIALS } from '@/lib/site'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: { absolute: 'VetNube · Software de gestión para veterinarias' },
  description:
    'Historias clínicas digitales, agenda de turnos, inventario con vencimientos FEFO, punto de venta y reportes para tu veterinaria. Probalo 14 días gratis.',
  openGraph: {
    title: 'VetNube · Software de gestión para veterinarias',
    description: 'Historias clínicas, agenda, inventario FEFO y caja en un solo lugar. 14 días gratis.',
    type: 'website',
    locale: 'es_AR',
  },
}

/** Landing pública. Si la persona ya inició sesión, los botones llevan a su clínica. */
export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const loggedIn = Boolean(user)

  const links = [
    { href: '#caracteristicas', label: 'Características' },
    { href: '#planes', label: 'Planes' },
    ...(TESTIMONIALS.length ? [{ href: '#testimonios', label: 'Testimonios' }] : []),
    { href: '#faq', label: 'Preguntas frecuentes' },
  ]

  return (
    <div className="bg-canvas">
      <LandingHeader links={links} loggedIn={loggedIn} />
      <main>
        <Hero loggedIn={loggedIn} />
        <Features />
        <Proof />
        <HowItWorks loggedIn={loggedIn} />
        <Pricing loggedIn={loggedIn} />
        <Testimonials />
        <Faq />
        <FinalCta loggedIn={loggedIn} />
      </main>
      <Footer links={links} />
    </div>
  )
}
