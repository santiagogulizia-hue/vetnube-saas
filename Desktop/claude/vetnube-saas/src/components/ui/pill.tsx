export function Pill({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ring-1 ring-inset ${className}`}>
      {label}
    </span>
  )
}
