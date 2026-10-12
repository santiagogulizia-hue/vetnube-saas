'use client'

import { useMemo } from 'react'

/** Formateador de moneda para componentes de cliente (las funciones no se pueden pasar desde el servidor). */
export function useMoney(currency: string) {
  return useMemo(() => {
    const f = new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 2 })
    return (n: number) => f.format(n || 0)
  }, [currency])
}
