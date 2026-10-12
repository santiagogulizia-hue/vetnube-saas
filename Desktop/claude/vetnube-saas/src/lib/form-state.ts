// Estado que devuelven las Server Actions de formularios. Se comparte entre
// servidor y cliente, por eso no importa nada de Supabase ni de Next.

export type FormState = {
  error?: string
  fieldErrors?: Record<string, string>
  /** Lo que el usuario escribió, para no perderlo cuando hay un error */
  values?: Record<string, string>
  /** Cambia en cada respuesta: se usa como `key` del <form> para volver a montarlo con `values` */
  submittedAt?: number
} | null

/** Valores iniciales de un formulario: lo enviado (si hubo error) o el registro que se edita. */
export function formDefaults(state: FormState, initial: Record<string, unknown> = {}) {
  return {
    value(key: string) {
      if (state?.values) return state.values[key] ?? ''
      const v = initial[key]
      return v === null || v === undefined ? '' : String(v)
    },
    checked(key: string) {
      return state?.values ? state.values[key] === 'on' : Boolean(initial[key])
    },
    error(key: string) {
      return state?.fieldErrors?.[key]
    },
  }
}
