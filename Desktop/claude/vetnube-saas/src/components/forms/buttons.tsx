'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { primaryButton, secondaryButton } from './fields'

export function SubmitButton({ children, pendingText = 'Guardando…' }: { children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={primaryButton}>
      {pending ? pendingText : children}
    </button>
  )
}

export function FormActions({ cancelHref, submitLabel }: { cancelHref: string; submitLabel: string }) {
  return (
    <div className="flex flex-wrap justify-end gap-3">
      <Link href={cancelHref} className={secondaryButton}>
        Cancelar
      </Link>
      <SubmitButton>{submitLabel}</SubmitButton>
    </div>
  )
}

/**
 * Botón de borrado en dos pasos, para usar dentro de un <form action={...}>.
 * El primer clic pide confirmación; el segundo envía el formulario.
 */
export function ConfirmSubmit({
  label,
  confirmLabel = 'Sí, confirmar',
  className = '',
}: {
  label: React.ReactNode
  confirmLabel?: string
  className?: string
}) {
  const [armed, setArmed] = useState(false)
  const { pending } = useFormStatus()
  const base = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold'

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={`${base} border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 ${className}`}
      >
        {label}
      </button>
    )
  }
  return (
    <button
      type="submit"
      autoFocus
      disabled={pending}
      onBlur={() => !pending && setArmed(false)}
      className={`${base} bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 ${className}`}
    >
      {pending ? 'Procesando…' : confirmLabel}
    </button>
  )
}
