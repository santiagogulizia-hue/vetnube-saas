import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal/legal-page'
import { DEFAULT_PLAN } from '@/lib/billing'
import { formatMoney } from '@/lib/format'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'Términos y condiciones' }

const holder = [SITE.legalName, SITE.taxId && `CUIT ${SITE.taxId}`, SITE.legalAddress && `con domicilio en ${SITE.legalAddress}`]
  .filter(Boolean)
  .join(', ')

export default function TerminosPage() {
  const price = formatMoney(DEFAULT_PLAN.price, DEFAULT_PLAN.currency)

  return (
    <LegalPage title="Términos y condiciones" updated="28 de octubre de 2026">
      <p>
        Estos términos regulan el uso de {SITE.name}, un sistema de gestión en la nube para clínicas veterinarias (el «Servicio»)
        {holder ? <>, prestado por {holder}</> : null}. Al crear una cuenta aceptás estos términos y la{' '}
        <Link href="/privacidad">Política de privacidad</Link>.
      </p>

      <h2>1. El Servicio</h2>
      <p>
        {SITE.name} permite registrar clientes, pacientes, historias clínicas, turnos, ventas, caja e inventario. Se usa desde el navegador,
        sin instalar nada. Podemos mejorar, cambiar o agregar funciones; si quitamos algo importante te avisamos con anticipación.
      </p>

      <h2>2. Cuenta y equipo</h2>
      <ul>
        <li>Tenés que ser mayor de 18 años y dar datos reales al registrarte.</li>
        <li>Cuidá tu contraseña: lo que se haga con tu cuenta queda bajo tu responsabilidad.</li>
        <li>
          Quien da de alta la clínica es su dueño/a en el sistema y decide a quién invita y con qué rol. Cada integrante del equipo tiene su
          propia cuenta.
        </li>
      </ul>

      <h2>3. Prueba gratuita, precio y cobro</h2>
      <ul>
        <li>Cada clínica nueva tiene 14 días de prueba gratuita con todas las funciones, sin cargar tarjeta.</li>
        <li>
          Después, el Servicio cuesta {price} por mes por clínica (precio final), con débito automático mensual a través de Mercado Pago. Si te
          suscribís durante la prueba, el primer cobro se hace cuando la prueba termina.
        </li>
        <li>
          Podemos actualizar el precio. Te avisamos por email con al menos 30 días de anticipación y, si no estás de acuerdo, podés cancelar
          antes de que rija.
        </li>
        <li>
          Si un cobro es rechazado, Mercado Pago lo reintenta. Si la suscripción termina sin pagarse, la clínica pasa a <b>modo solo lectura</b>
          : podés ver tus datos, pero no cargar ni modificar nada hasta volver a suscribirte.
        </li>
      </ul>

      <h2>4. Cancelación y arrepentimiento</h2>
      <ul>
        <li>
          Cancelás cuando quieras desde Configuración → Plan y facturación, sin permanencia mínima. No se hacen más débitos y seguís usando el
          Servicio hasta el final del período ya pagado.
        </li>
        <li>
          Tenés derecho a revocar la contratación dentro de los 10 días corridos desde que te suscribiste, sin costo y sin dar motivos (art. 34
          de la Ley 24.240). Podés hacerlo desde el <Link href="/arrepentimiento">Botón de arrepentimiento</Link>; si ya se hizo un cobro, te
          lo devolvemos completo por el mismo medio de pago.
        </li>
      </ul>

      <h2>5. Tus datos son tuyos</h2>
      <ul>
        <li>
          Los datos que cargás (clientes, pacientes, historias clínicas, ventas) pertenecen a tu clínica. Nosotros solo los guardamos y
          procesamos para prestarte el Servicio, como se explica en la <Link href="/privacidad">Política de privacidad</Link>.
        </li>
        <li>
          Vos sos responsable de tener el consentimiento de tus clientes para registrar sus datos y de que la información clínica sea correcta.
        </li>
        <li>
          Podés consultar tus datos en cualquier momento, aun en modo solo lectura, y pedirnos una copia completa. Si cerrás la cuenta, los
          conservamos 90 días por si querés volver y después los borramos, salvo lo que la ley nos obligue a guardar.
        </li>
      </ul>

      <h2>6. Uso aceptable</h2>
      <p>
        No podés usar el Servicio para fines ilegales, cargar datos de terceros sin derecho a hacerlo, intentar acceder a cuentas o datos de
        otras clínicas, ni sobrecargar o vulnerar el sistema. Si eso pasa, podemos suspender la cuenta.
      </p>

      <h2>7. Disponibilidad y responsabilidad</h2>
      <ul>
        <li>
          Trabajamos para que el Servicio esté siempre disponible y hacemos copias de seguridad, pero puede haber interrupciones por
          mantenimiento o fallas de proveedores (internet, hosting).
        </li>
        <li>
          {SITE.name} es una herramienta de registro y gestión: no da consejo veterinario y las decisiones clínicas son del profesional.
        </li>
        <li>
          Nuestra responsabilidad se limita, en la medida que permita la ley, al monto que pagaste en los últimos 3 meses. Nada de esto limita
          tus derechos como consumidor.
        </li>
      </ul>

      <h2>8. Facturación</h2>
      <p>
        Hoy {SITE.name} registra ventas y comprobantes internos, pero no emite facturas electrónicas de AFIP/ARCA: la facturación de tu clínica
        la seguís haciendo con tu sistema habitual.
      </p>

      <h2>9. Cambios a estos términos</h2>
      <p>
        Si cambiamos estos términos de forma importante, te avisamos por email o dentro del sistema antes de que rijan. Si seguís usando el
        Servicio después, se entiende que los aceptás; si no, podés cancelar.
      </p>

      <h2>10. Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Si sos consumidor, podés reclamar ante los tribunales de tu domicilio o
        ante <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario" target="_blank" rel="noopener noreferrer">Defensa del Consumidor</a>.
      </p>
    </LegalPage>
  )
}
