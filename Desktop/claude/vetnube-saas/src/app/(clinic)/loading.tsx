/**
 * Esqueleto mientras carga cualquier pantalla de la clínica: el menú queda fijo
 * y el cambio de sección se ve al instante, aunque los datos tarden.
 */
export default function ClinicLoading() {
  return (
    <div className="animate-pulse space-y-6 motion-reduce:animate-none" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-32 rounded bg-line" />
          <div className="h-8 w-64 rounded bg-line" />
        </div>
        <div className="h-10 w-36 rounded-lg bg-line" />
      </div>
      <div className="h-11 w-full max-w-md rounded-lg bg-line" />
      <div className="divide-y divide-line rounded-xl border border-line bg-white">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="size-10 shrink-0 rounded-full bg-line" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-1/3 rounded bg-line" />
              <div className="h-3 w-1/2 rounded bg-line" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
