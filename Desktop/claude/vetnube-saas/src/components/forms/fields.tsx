// Piezas de formulario sin estado: sirven tanto en Server como en Client Components.

export const primaryButton =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60'
export const secondaryButton =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-fg hover:border-brand-500'

export const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-100 aria-[invalid=true]:border-rose-400 disabled:bg-canvas'

type FieldProps = {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

export function Field({ label, htmlFor, error, hint, required, className = '', children }: FieldProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-bold text-muted">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs font-semibold text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <legend className="sr-only">{title}</legend>
      <h2 className="font-display text-base font-bold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

export function Checkbox({ id, name, label, defaultChecked }: { id: string; name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2.5 self-end py-2 text-sm font-semibold">
      <input id={id} name={name} type="checkbox" defaultChecked={defaultChecked} className="size-4 accent-brand-600" />
      {label}
    </label>
  )
}

export function FormAlert({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
      {message}
    </p>
  )
}

/** Atributos de accesibilidad para un input con posible error. */
export const errorProps = (id: string, error?: string) =>
  error ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {}
