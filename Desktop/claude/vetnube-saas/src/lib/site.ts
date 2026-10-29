// Datos públicos de la landing. Completalos con información REAL:
// lo que quede vacío no se muestra (no publiques cifras ni testimonios inventados).

export const SITE = {
  name: 'VetNube',
  /** Email de contacto y soporte (ej.: hola@vetnube.com.ar) */
  contactEmail: 'damiangulizia@gmail.com',
  /** WhatsApp de ventas/soporte, solo dígitos con código de país (ej.: 5491155550101) */
  whatsapp: '5491137723267',
  instagram: 'vetnube.ar',
  linkedin: '',
  /**
   * Titular del servicio, como figura en AFIP. Lo exige la Ley de Defensa del
   * Consumidor para vender online: se muestra en los términos y en el pie.
   */
  legalName: 'Nestor Damian Gulizia',
  /** CUIT del titular (ej.: 20-12345678-9) */
  taxId: '20-25779255-3',
  /** Domicilio legal (ej.: Av. Siempre Viva 742, Rosario, Santa Fe) */
  legalAddress: 'Luis Bernardez 961',
  termsUrl: '/terminos',
  privacyUrl: '/privacidad',
}

/** Cifras de uso reales (ej.: { value: '120', label: 'Veterinarias activas' }). Vacío = se muestran datos del producto. */
export const USAGE_STATS: { value: string; label: string }[] = []

/** Testimonios reales, con permiso de la persona. Vacío = la sección y su link no aparecen. */
export const TESTIMONIALS: { quote: string; name: string; role: string; clinic: string }[] = []

export const whatsappHref = (text: string) =>
  SITE.whatsapp ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}` : null

/** Link a Instagram: acepta la URL completa o solo el usuario ("vetnube.ar" o "@vetnube.ar"). */
export const instagramHref = () =>
  SITE.instagram.startsWith('http') ? SITE.instagram : `https://www.instagram.com/${SITE.instagram.replace(/^@/, '')}`

/** Cómo contactarnos, en una frase, con el primer canal que esté cargado. */
export function contactLine() {
  if (SITE.contactEmail) return `Escribinos a ${SITE.contactEmail}.`
  if (SITE.whatsapp) return `Escribinos por WhatsApp al +${SITE.whatsapp}.`
  if (SITE.instagram) return `Escribinos por Instagram a @${SITE.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')}.`
  return 'Escribinos por los canales de contacto de la página de inicio.'
}

/**
 * Links legales del pie. El botón de arrepentimiento (Res. 424/2020) y el
 * acceso a Defensa del Consumidor (Res. 38/2020) son obligatorios para vender online.
 */
export const LEGAL_LINKS: { href: string; label: string; external?: boolean }[] = [
  { href: '/terminos', label: 'Términos y condiciones' },
  { href: '/privacidad', label: 'Política de privacidad' },
  { href: '/arrepentimiento', label: 'Botón de arrepentimiento' },
  {
    href: 'https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario',
    label: 'Defensa de las y los consumidores. Para reclamos ingrese aquí',
    external: true,
  },
]
