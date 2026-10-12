import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Package,
  Receipt,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { DEFAULT_PLAN } from '@/lib/billing'
import { formatMoney } from '@/lib/format'
import { SITE, TESTIMONIALS, USAGE_STATS, whatsappHref } from '@/lib/site'
import { DashboardPreview } from './dashboard-preview'

const SIGNUP = '/login?modo=registro'
const container = 'mx-auto max-w-6xl px-4 sm:px-6'
const eyebrow = 'text-xs font-bold tracking-[0.14em] text-brand-600 uppercase'
const h2 = 'mt-2 font-display text-3xl font-bold text-balance sm:text-4xl'

function PrimaryCta({ loggedIn, children = 'Comenzar prueba gratuita' }: { loggedIn: boolean; children?: React.ReactNode }) {
  return (
    <Link
      href={loggedIn ? '/dashboard' : SIGNUP}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 font-bold text-white shadow-sm transition hover:bg-brand-700 hover:shadow-md"
    >
      {loggedIn ? 'Ir a mi clínica' : children}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  )
}

// ---------------------------------------------------------------------------

export function Hero({ loggedIn }: { loggedIn: boolean }) {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36">
      {/* Fondo: un halo turquesa muy suave */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(60%_60%_at_70%_20%,rgba(52,196,182,0.18),transparent_70%)]"
      />
      <div className={`${container} grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]`}>
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-700 shadow-sm ring-1 ring-brand-200">
            <span className="size-1.5 rounded-full bg-brand-500" aria-hidden />
            Software para veterinarias, en la nube
          </p>
          <h1 className="mt-5 font-display text-4xl leading-[1.05] font-bold text-balance sm:text-5xl xl:text-[3.5rem]">
            La plataforma integral para simplificar la gestión de tu veterinaria
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Historias clínicas digitales, agenda de turnos, inventario con vencimientos FEFO y punto de venta en un solo lugar. Optimizá
            tu tiempo y cuidá mejor a tus pacientes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryCta loggedIn={loggedIn} />
            <a
              href="#producto"
              className="inline-flex items-center justify-center rounded-xl border border-line bg-white px-6 py-3.5 font-bold text-fg transition hover:border-brand-500"
            >
              Ver cómo funciona
            </a>
          </div>
          <p className="mt-4 text-sm text-muted">14 días gratis · Sin tarjeta para empezar · Cancelás cuando quieras</p>
        </div>
        <div className="lg:pl-4">
          <DashboardPreview />
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: Stethoscope,
    title: 'Historias clínicas digitales',
    text: 'Consultas con signos vitales, diagnóstico y tratamiento, vacunas y desparasitaciones, curva de peso y estudios adjuntos. Alergias siempre a la vista.',
  },
  {
    icon: CalendarDays,
    title: 'Agenda y sala de espera',
    text: 'Vista diaria, semanal y mensual por profesional, sin turnos superpuestos. Recepción marca «llegó» y el consultorio lo ve al instante.',
  },
  {
    icon: Package,
    title: 'Inventario con vencimientos (FEFO)',
    text: 'Lotes con fecha de vencimiento: al vender sale primero el que vence antes. Alertas de stock mínimo y de lotes por vencer.',
  },
  {
    icon: Receipt,
    title: 'Punto de venta y caja diaria',
    text: 'Ventas con lector de código de barras, pagos combinados (efectivo, tarjeta, transferencia, Mercado Pago), cuenta corriente y arqueo de caja.',
  },
  {
    icon: BarChart3,
    title: 'Reportes de ventas y ganancias',
    text: 'Ventas, costo y margen por período, productos más vendidos y actividad clínica. Exportación a Excel para tu contador.',
  },
  {
    icon: Users,
    title: 'Equipo con roles',
    text: 'Invitá a veterinarios y recepción con permisos distintos. Cada clínica tiene sus datos aislados y protegidos.',
  },
]

export function Features() {
  return (
    <section id="caracteristicas" className="scroll-mt-20 py-20 sm:py-24">
      <div className={container}>
        <div className="max-w-2xl">
          <p className={eyebrow}>Características</p>
          <h2 className={h2}>Todo lo que pasa en tu clínica, en un solo sistema</h2>
          <p className="mt-4 text-lg text-muted">Dejá las planillas, los cuadernos y los cinco programas distintos.</p>
        </div>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="group rounded-2xl border border-line bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md motion-reduce:transform-none">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------

/** Cifras reales si las hay; si no, datos verificables del producto. */
export function Proof() {
  const items = USAGE_STATS.length
    ? USAGE_STATS
    : [
        { value: '14 días', label: 'de prueba gratis, sin tarjeta' },
        { value: 'Ilimitados', label: 'pacientes, turnos y usuarios del equipo' },
        { value: '100% web', label: 'desde la PC, la tablet o el celular' },
        { value: 'Por clínica', label: 'datos aislados con seguridad en la base de datos' },
      ]
  return (
    <section aria-label="VetNube en números" className="bg-ink-900 py-14 text-white">
      <dl className={`${container} grid grid-cols-2 gap-8 lg:grid-cols-4`}>
        {items.map((s) => (
          <div key={s.label}>
            <dt className="sr-only">{s.label}</dt>
            <dd className="font-display text-3xl font-bold text-brand-400 sm:text-4xl">{s.value}</dd>
            <dd className="mt-1 text-sm text-ink-200">{s.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

// ---------------------------------------------------------------------------

const STEPS = [
  { title: 'Creá tu cuenta', text: 'Con tu email, en menos de un minuto. Sin instalar nada.' },
  { title: 'Cargá tu clínica', text: 'Datos, horarios de atención, productos y servicios. Empezá por los clientes de la semana.' },
  { title: 'Sumá a tu equipo', text: 'Invitá a veterinarios y recepción con el rol que corresponda. Cada uno ve lo que necesita.' },
]

export function HowItWorks({ loggedIn }: { loggedIn: boolean }) {
  return (
    <section id="producto" className="scroll-mt-20 py-20 sm:py-24">
      <div className={`${container} grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center`}>
        <div>
          <p className={eyebrow}>Cómo funciona</p>
          <h2 className={h2}>De la primera consulta al cierre de caja</h2>
          <p className="mt-4 text-lg text-muted">
            El turno se convierte en consulta, la consulta en historia clínica y la venta descuenta stock del lote correcto. Todo
            conectado, sin cargar lo mismo dos veces.
          </p>
          <div className="mt-8">
            <PrimaryCta loggedIn={loggedIn}>Empezar ahora</PrimaryCta>
          </div>
        </div>
        <ol className="space-y-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-2xl border border-line bg-white p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 font-display font-bold text-white" aria-hidden>
                {i + 1}
              </span>
              <div>
                <h3 className="font-display text-lg font-bold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------

export function Pricing({ loggedIn }: { loggedIn: boolean }) {
  const plan = DEFAULT_PLAN
  return (
    <section id="planes" className="scroll-mt-20 bg-white py-20 sm:py-24">
      <div className={container}>
        <div className="mx-auto max-w-2xl text-center">
          <p className={eyebrow}>Planes</p>
          <h2 className={h2}>Un precio simple, todo incluido</h2>
          <p className="mt-4 text-lg text-muted">Sin costo por usuario ni por paciente. Probalo gratis y después decidís.</p>
        </div>

        <div className="mx-auto mt-12 max-w-md rounded-2xl border-2 border-brand-500 bg-white p-8 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-xl font-bold">{plan.name}</h3>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">14 días gratis</span>
          </div>
          <p className="mt-4 font-display text-5xl font-bold tabular-nums">
            {formatMoney(plan.price, plan.currency)}
            <span className="ml-1 text-base font-normal text-muted">/ mes</span>
          </p>
          <p className="mt-1 text-sm text-muted">Débito automático con Mercado Pago. Cancelás cuando quieras.</p>
          <ul className="mt-6 space-y-3">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-600 text-white" aria-hidden>
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href={loggedIn ? '/configuracion?tab=plan' : SIGNUP}
            className="mt-8 block rounded-xl bg-brand-600 py-3.5 text-center font-bold text-white transition hover:bg-brand-700"
          >
            {loggedIn ? 'Ver mi plan' : 'Elegir plan y probar gratis'}
          </Link>
          <p className="mt-3 text-center text-xs text-muted">No pedimos tarjeta para la prueba. Te suscribís desde la app cuando quieras.</p>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------

export function Testimonials() {
  if (TESTIMONIALS.length === 0) return null
  return (
    <section id="testimonios" className="scroll-mt-20 py-20 sm:py-24">
      <div className={container}>
        <p className={eyebrow}>Testimonios</p>
        <h2 className={h2}>Lo que dicen las veterinarias</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="rounded-2xl border border-line bg-white p-6">
              <blockquote className="text-sm leading-relaxed">“{t.quote}”</blockquote>
              <figcaption className="mt-4 text-sm">
                <span className="font-bold">{t.name}</span>
                <span className="block text-muted">
                  {t.role} · {t.clinic}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------

const FAQ = [
  {
    q: '¿Necesito tarjeta para probarlo?',
    a: 'No. Creás tu cuenta y tenés 14 días con todas las funciones. Si te gusta, te suscribís desde la app con Mercado Pago.',
  },
  {
    q: '¿Tengo que instalar algo?',
    a: 'No. VetNube funciona en el navegador de cualquier computadora, tablet o celular. Tus datos quedan en la nube y se ven en todos tus equipos.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'Cada clínica tiene sus datos aislados: las reglas de seguridad están en la propia base de datos, no solo en la pantalla. Además, cada persona del equipo ve solo lo que su rol permite.',
  },
  {
    q: '¿Puedo sumar a mi equipo?',
    a: 'Sí, sin costo extra. Invitás a cada persona por email con su rol: dueño/a, administración, veterinario/a o recepción.',
  },
  {
    q: '¿Cómo funciona el cobro?',
    a: `Débito automático mensual de ${formatMoney(DEFAULT_PLAN.price, DEFAULT_PLAN.currency)} con Mercado Pago. Si te suscribís durante la prueba, el primer cobro es cuando la prueba termina.`,
  },
  {
    q: '¿Puedo cancelar cuando quiera?',
    a: 'Sí. Cancelás desde Configuración → Plan y facturación y no se hacen más débitos. Sin permanencia mínima.',
  },
  {
    q: '¿Emite factura electrónica?',
    a: 'Todavía no. Hoy registra ventas y comprobantes internos, con reportes y exportación para tu contador.',
  },
]

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-20 sm:py-24">
      <div className={`${container} grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]`}>
        <div>
          <p className={eyebrow}>Preguntas frecuentes</p>
          <h2 className={h2}>Lo que suelen preguntarnos</h2>
          {(SITE.contactEmail || SITE.whatsapp) && (
            <p className="mt-4 text-muted">
              ¿Otra duda?{' '}
              {SITE.whatsapp ? (
                <a href={whatsappHref('Hola, tengo una consulta sobre VetNube') ?? '#'} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-600 hover:underline">
                  Escribinos por WhatsApp
                </a>
              ) : (
                <a href={`mailto:${SITE.contactEmail}`} className="font-bold text-brand-600 hover:underline">
                  Escribinos
                </a>
              )}
              .
            </p>
          )}
        </div>
        <div className="divide-y divide-line rounded-2xl border border-line bg-white">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group px-6 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                {q}
                <ChevronDown className="size-5 shrink-0 text-muted transition group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------

export function FinalCta({ loggedIn }: { loggedIn: boolean }) {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-ink-900 px-6 py-14 text-center text-white sm:px-12">
        <ShieldCheck className="mx-auto size-10 text-brand-400" aria-hidden />
        <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold text-balance sm:text-4xl">
          Ordená tu veterinaria esta misma semana
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-ink-200">Probalo 14 días gratis con todas las funciones. Sin tarjeta y sin instalar nada.</p>
        <div className="mt-8">
          <PrimaryCta loggedIn={loggedIn} />
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------

export function Footer({ links }: { links: { href: string; label: string }[] }) {
  const year = new Date().getFullYear()
  // Acepta la URL completa o solo el usuario ("vetnube.ar" o "@vetnube.ar")
  const instagramHref = SITE.instagram.startsWith('http')
    ? SITE.instagram
    : `https://www.instagram.com/${SITE.instagram.replace(/^@/, '')}`
  const social = [
    SITE.instagram && { href: instagramHref, label: 'Instagram', icon: Instagram },
    SITE.linkedin && { href: SITE.linkedin, label: 'LinkedIn', icon: Linkedin },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Instagram }[]
  const wa = whatsappHref('Hola, quiero saber más sobre VetNube')

  return (
    <footer className="border-t border-line bg-white">
      <div className={`${container} grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4`}>
        <div className="lg:col-span-2">
          <BrandLogo subtitle="Gestión veterinaria en la nube" />
          <p className="mt-4 max-w-sm text-sm text-muted">
            Historias clínicas, agenda, inventario y caja para clínicas veterinarias, en un solo sistema.
          </p>
        </div>
        <div>
          <p className="text-sm font-bold">Producto</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-fg">
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/login" className="hover:text-fg">
                Iniciar sesión
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-bold">Contacto y soporte</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {SITE.contactEmail && (
              <li>
                <a href={`mailto:${SITE.contactEmail}`} className="inline-flex items-center gap-2 hover:text-fg">
                  <Mail className="size-4" aria-hidden />
                  {SITE.contactEmail}
                </a>
              </li>
            )}
            {wa && (
              <li>
                <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-fg">
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp
                </a>
              </li>
            )}
            {!SITE.contactEmail && !wa && <li>Pronto vas a encontrar acá nuestros datos de contacto.</li>}
          </ul>
          {social.length > 0 && (
            <div className="mt-4 flex gap-2">
              {social.map(({ href, label, icon: Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="grid size-9 place-items-center rounded-lg border border-line hover:border-brand-500 hover:text-brand-600">
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-line">
        <div className={`${container} flex flex-wrap items-center justify-between gap-3 py-5 text-xs text-muted`}>
          <p>
            © {year} {SITE.name}. Todos los derechos reservados.
          </p>
          <nav aria-label="Legales" className="flex gap-4">
            {SITE.termsUrl && (
              <a href={SITE.termsUrl} className="hover:text-fg">
                Términos y condiciones
              </a>
            )}
            {SITE.privacyUrl && (
              <a href={SITE.privacyUrl} className="hover:text-fg">
                Política de privacidad
              </a>
            )}
          </nav>
        </div>
      </div>
    </footer>
  )
}
