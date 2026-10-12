import { CalendarDays, LayoutDashboard, Package, PawPrint, Receipt, Syringe, Users, Wallet } from 'lucide-react'

/**
 * Vista previa ilustrativa del panel real de VetNube (mismo layout y colores),
 * armada con HTML: liviana, nítida en cualquier pantalla y sin capturas que actualizar.
 * Los nombres son datos de ejemplo.
 */
const NAV = [
  { icon: LayoutDashboard, label: 'Inicio', on: true },
  { icon: CalendarDays, label: 'Agenda' },
  { icon: Users, label: 'Clientes' },
  { icon: PawPrint, label: 'Pacientes' },
  { icon: Receipt, label: 'Ventas y caja' },
  { icon: Package, label: 'Inventario' },
]

const TURNOS = [
  { hora: '09:00', pet: 'Toby', detalle: 'Control · Lucía F.', estado: 'Atendido', cls: 'bg-emerald-50 text-emerald-700', av: 'bg-sky-100 text-sky-800' },
  { hora: '10:30', pet: 'Mishi', detalle: 'Vacunación · Martín S.', estado: 'En espera', cls: 'bg-amber-50 text-amber-700', av: 'bg-amber-100 text-amber-800' },
  { hora: '11:15', pet: 'Rocco', detalle: 'Consulta · Carla B.', estado: 'Confirmado', cls: 'bg-sky-50 text-sky-700', av: 'bg-sky-100 text-sky-800' },
  { hora: '16:00', pet: 'Pancho', detalle: 'Peluquería · Jorge M.', estado: 'Pendiente', cls: 'bg-slate-100 text-slate-600', av: 'bg-emerald-100 text-emerald-800' },
]

export function DashboardPreview() {
  return (
    <figure className="relative" aria-label="Vista previa del panel de VetNube con datos de ejemplo">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_-20px_rgba(13,51,51,0.35)]">
        {/* Barra de ventana */}
        <div className="flex items-center gap-1.5 border-b border-line bg-canvas px-4 py-2.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-rose-300" />
          <span className="size-2.5 rounded-full bg-amber-300" />
          <span className="size-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 truncate rounded-md bg-white px-3 py-0.5 text-[11px] text-muted ring-1 ring-line">app.vetnube · Inicio</span>
        </div>

        <div className="grid grid-cols-[9.5rem_minmax(0,1fr)] max-sm:grid-cols-1">
          {/* Menú lateral */}
          <div className="bg-ink-900 p-3 max-sm:hidden" aria-hidden>
            <p className="px-2 pb-3 font-display text-sm font-bold text-white">VetNube</p>
            <ul className="space-y-0.5">
              {NAV.map(({ icon: Icon, label, on }) => (
                <li key={label} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-semibold ${on ? 'bg-ink-700 text-white' : 'text-ink-200'}`}>
                  <Icon className={`size-3.5 ${on ? 'text-brand-400' : ''}`} />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Contenido */}
          <div className="space-y-3 bg-canvas p-3 sm:p-4" aria-hidden>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-brand-600 uppercase">Lunes, 12 de octubre</p>
              <p className="font-display text-base font-bold">Buen día, Dra. Gómez</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: CalendarDays, label: 'Turnos hoy', value: '8', sub: '3 atendidos' },
                { icon: PawPrint, label: 'Pacientes', value: '412', sub: '298 tutores' },
                { icon: Wallet, label: 'Ingresos hoy', value: '$ 186.500', sub: '11 ventas' },
                { icon: Syringe, label: 'Vacunas', value: '6', sub: '2 vencidas', alert: true },
              ].map(({ icon: Icon, label, value, sub, alert }) => (
                <div key={label} className="rounded-lg border border-line bg-white p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold tracking-wider text-muted uppercase">{label}</span>
                    <Icon className={`size-3.5 ${alert ? 'text-rose-500' : 'text-brand-600'}`} />
                  </div>
                  <p className="mt-1 font-display text-sm font-bold tabular-nums sm:text-base">{value}</p>
                  <p className={`text-[10px] ${alert ? 'font-bold text-rose-600' : 'text-muted'}`}>{sub}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-line bg-white p-3">
              <p className="mb-2 text-xs font-bold">Agenda de hoy</p>
              <ul className="divide-y divide-line">
                {TURNOS.map((t) => (
                  <li key={t.hora} className="flex items-center gap-2 py-1.5">
                    <span className="w-9 text-[11px] font-bold tabular-nums">{t.hora}</span>
                    <span className={`grid size-6 place-items-center rounded-full text-[10px] font-bold ${t.av}`}>{t.pet[0]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-bold">{t.pet}</span>
                      <span className="block truncate text-[10px] text-muted">{t.detalle}</span>
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${t.cls}`}>{t.estado}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta flotante: alerta clínica */}
      <div className="absolute -bottom-5 -left-3 hidden w-56 rounded-xl border border-line bg-white p-3 shadow-lg sm:block lg:-left-8" aria-hidden>
        <p className="text-[10px] font-bold tracking-wider text-muted uppercase">Historia clínica</p>
        <p className="mt-1 text-xs font-bold">Rocco · Bulldog francés</p>
        <p className="mt-1.5 rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">Alergia: proteína de pollo</p>
      </div>
      <figcaption className="sr-only">Panel de inicio con turnos del día, indicadores y alertas. Datos de ejemplo.</figcaption>
    </figure>
  )
}
