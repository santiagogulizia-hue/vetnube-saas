type Props = {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function Card({ title, action, children, className = '' }: Props) {
  return (
    <section className={`rounded-xl border border-line bg-white p-5 shadow-sm ${className}`}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-bold">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  )
}
