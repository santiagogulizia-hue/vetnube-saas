/** Mensaje de error que llega por la URL (?error=) después de una acción. */
export function ErrorNotice({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
      {message}
    </p>
  )
}
