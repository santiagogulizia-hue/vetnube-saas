import type { Metadata } from 'next'
import Link from 'next/link'
import { BrandLogo } from '@/components/brand-logo'
import { SubmitButton } from '@/components/forms/buttons'
import { getSession } from '@/lib/clinic'
import { ROLE_LABEL } from '@/lib/labels'
import type { MemberRole } from '@/lib/types'
import { acceptInvitation } from './actions'

export const metadata: Metadata = { title: 'Invitación' }

type Preview = { clinic_name: string; role: MemberRole; email: string; email_matches: boolean; expired: boolean; accepted: boolean } | null
type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }

/** Pantalla del link de invitación. El middleware exige iniciar sesión antes de llegar acá. */
export default async function InvitacionPage({ params, searchParams }: Props) {
  const [{ token }, { error }] = await Promise.all([params, searchParams])
  const { supabase, user } = await getSession()
  const valid = /^[0-9a-f-]{36}$/i.test(token)
  const { data } = valid ? await supabase.rpc('invitation_preview', { p_token: token }) : { data: null }
  const invite = data as Preview

  let body: React.ReactNode
  if (!invite) {
    body = <p className="text-sm text-muted">Este link de invitación no existe. Pedile a la clínica que te envíe uno nuevo.</p>
  } else if (invite.accepted) {
    body = (
      <p className="text-sm text-muted">
        Esta invitación ya fue usada.{' '}
        <Link href="/dashboard" className="font-bold text-brand-600 hover:underline">
          Ir al inicio
        </Link>
      </p>
    )
  } else if (invite.expired) {
    body = <p className="text-sm text-muted">La invitación venció. Pedile a {invite.clinic_name} que te genere una nueva.</p>
  } else if (!invite.email_matches) {
    body = (
      <div className="space-y-3 text-sm">
        <p>
          La invitación es para <b>{invite.email}</b>, pero ingresaste como <b>{user.email}</b>.
        </p>
        <form action="/auth/signout" method="post">
          <button className="font-bold text-brand-600 hover:underline">Cerrar sesión e ingresar con el otro email</button>
        </form>
      </div>
    )
  } else {
    body = (
      <form action={acceptInvitation.bind(null, token)} className="space-y-4">
        <p className="text-sm">
          Vas a sumarte como <b>{ROLE_LABEL[invite.role]}</b>. Vas a ver la agenda, los pacientes y lo que permita tu rol.
        </p>
        <SubmitButton pendingText="Uniéndote…">Aceptar invitación</SubmitButton>
      </form>
    )
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <BrandLogo />
        <section className="mt-8 space-y-4 rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h1 className="font-display text-2xl font-bold">{invite ? `Te invitaron a ${invite.clinic_name}` : 'Invitación'}</h1>
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}
          {body}
        </section>
      </div>
    </main>
  )
}
