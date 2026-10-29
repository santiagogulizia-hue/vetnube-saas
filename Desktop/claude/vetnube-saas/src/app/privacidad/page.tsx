import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'
import { SITE, contactLine } from '@/lib/site'

export const metadata: Metadata = { title: 'Política de privacidad' }

const holder = [SITE.legalName, SITE.taxId && `CUIT ${SITE.taxId}`, SITE.legalAddress && `domicilio en ${SITE.legalAddress}`]
  .filter(Boolean)
  .join(', ')

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad" updated="28 de octubre de 2026">
      <p>
        En {SITE.name} cuidamos los datos que nos confiás. Esta política explica qué datos tratamos, para qué y qué derechos tenés, de acuerdo con
        la Ley 25.326 de Protección de los Datos Personales.
        {holder ? <> El responsable es {holder}.</> : null}
      </p>

      <h2>1. Dos tipos de datos</h2>
      <ul>
        <li>
          <b>Datos de tu cuenta:</b> nombre, email, datos de la clínica y de la suscripción. Acá {SITE.name} es el responsable del tratamiento.
        </li>
        <li>
          <b>Datos que carga la clínica:</b> sus clientes (nombre, documento, teléfono, dirección), pacientes, historias clínicas, turnos y
          ventas. Esos datos son de la clínica, que es la responsable; {SITE.name} solo los guarda y procesa por cuenta de ella para prestar el
          Servicio, y no los usa para nada más.
        </li>
      </ul>

      <h2>2. Para qué usamos los datos de tu cuenta</h2>
      <ul>
        <li>Darte acceso al sistema y mantener tu sesión.</li>
        <li>Gestionar la suscripción y los cobros.</li>
        <li>Mandarte emails necesarios: confirmación de cuenta, recuperación de contraseña, avisos del servicio y de cobros.</li>
        <li>Responder tus consultas y mejorar el Servicio.</li>
      </ul>
      <p>No vendemos ni alquilamos datos personales, y no los usamos para publicidad de terceros.</p>

      <h2>3. Con quién los compartimos</h2>
      <p>Solo con los proveedores que necesitamos para que el Servicio funcione:</p>
      <ul>
        <li>
          <b>Supabase</b> (base de datos, archivos y autenticación) y <b>Vercel</b> (hosting de la aplicación). Sus servidores pueden estar fuera
          de Argentina; trabajan con estándares de seguridad y confidencialidad adecuados.
        </li>
        <li>
          <b>Mercado Pago</b>, para procesar la suscripción. Los datos de tu tarjeta los carga y guarda Mercado Pago: {SITE.name} nunca los ve.
        </li>
      </ul>
      <p>También podemos entregar datos si lo ordena una autoridad competente.</p>

      <h2>4. Seguridad</h2>
      <ul>
        <li>Las conexiones están cifradas (HTTPS) y las contraseñas se guardan cifradas: nadie, ni nosotros, puede leerlas.</li>
        <li>
          Cada clínica solo puede ver sus propios datos: la separación se controla en la base de datos misma, no solo en la pantalla.
        </li>
        <li>Dentro de la clínica, cada integrante ve y hace solo lo que permite su rol.</li>
      </ul>

      <h2>5. Cuánto tiempo los guardamos</h2>
      <p>
        Mientras la cuenta esté activa. Si la cerrás, conservamos los datos 90 días por si querés volver y después los borramos, salvo lo que
        debamos guardar por obligaciones legales o fiscales (por ejemplo, registros de cobros).
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Podés pedir acceso, rectificación, actualización o supresión de tus datos personales. Respondemos el acceso dentro de los 10 días corridos
        y las rectificaciones o supresiones dentro de los 5 días hábiles. {contactLine()} Si sos cliente de una clínica que usa {SITE.name},
        hacé tu pedido directamente a esa clínica, que es la responsable de tus datos; nosotros la ayudamos a cumplirlo.
      </p>
      <p>
        La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley 25.326, tiene la atribución de atender las
        denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de
        protección de datos personales.
      </p>

      <h2>7. Cookies</h2>
      <p>
        Usamos solo cookies necesarias: la de tu sesión y la que recuerda qué clínica tenés abierta. No usamos cookies de publicidad ni de
        seguimiento.
      </p>

      <h2>8. Cambios</h2>
      <p>Si cambiamos esta política de forma importante, te avisamos por email o dentro del sistema.</p>
    </LegalPage>
  )
}
