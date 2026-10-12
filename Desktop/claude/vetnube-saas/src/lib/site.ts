// Datos públicos de la landing. Completalos con información REAL:
// lo que quede vacío no se muestra (no publiques cifras ni testimonios inventados).

export const SITE = {
  name: 'VetNube',
  /** Email de contacto y soporte (ej.: hola@vetnube.com.ar) */
  contactEmail: '',
  /** WhatsApp de ventas/soporte, solo dígitos con código de país (ej.: 5491155550101) */
  whatsapp: '',
  instagram: 'vetnube.ar',
  linkedin: '',
  /** Páginas legales: completá cuando tengas los textos revisados por un profesional */
  termsUrl: '',
  privacyUrl: '',
}

/** Cifras de uso reales (ej.: { value: '120', label: 'Veterinarias activas' }). Vacío = se muestran datos del producto. */
export const USAGE_STATS: { value: string; label: string }[] = []

/** Testimonios reales, con permiso de la persona. Vacío = la sección y su link no aparecen. */
export const TESTIMONIALS: { quote: string; name: string; role: string; clinic: string }[] = []

export const whatsappHref = (text: string) =>
  SITE.whatsapp ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}` : null
