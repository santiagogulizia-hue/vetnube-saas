export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6 motion-reduce:animate-none" aria-busy="true" aria-label="Cargando inicio">
      <div className="space-y-2">
        <div className="h-3 w-40 rounded bg-line" />
        <div className="h-8 w-72 rounded bg-line" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-32 rounded-xl border border-line bg-white" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="h-80 rounded-xl border border-line bg-white" />
        <div className="h-80 rounded-xl border border-line bg-white" />
      </div>
    </div>
  )
}
