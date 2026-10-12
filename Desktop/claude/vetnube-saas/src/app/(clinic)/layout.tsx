import { AppShell } from '@/components/layout/app-shell'
import { requireClinic } from '@/lib/clinic'
import { ROLE_LABEL } from '@/lib/labels'

/** Todas las pantallas dentro de (clinic) exigen sesión y clínica, y comparten el menú. */
export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const { user, clinic } = await requireClinic()

  return (
    <AppShell
      clinicName={clinic.name}
      user={{ name: user.fullName, email: user.email, roleLabel: ROLE_LABEL[clinic.role] }}
    >
      {children}
    </AppShell>
  )
}
