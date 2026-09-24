'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Pestaña activa guardada en la URL (`?tab=…`), para poder abrir una vista
 * directamente, recargar sin perderla y compartir el enlace. La pestaña por
 * defecto no aparece en la URL. Un valor que no esté en `allowed` cae al
 * de por defecto. Cambiar de pestaña reemplaza la entrada del historial en vez
 * de sumar una por cada clic.
 *
 * Usa `useSearchParams`, así que la página que lo use debe ir dentro de un
 * `<Suspense>` (ver los `page.js` de cada ruta).
 *
 * @param {string[]} allowed  Valores válidos; el primero es el de por defecto.
 * @param {string} [param]
 * @returns {[string, (value: string) => void]}
 */
export function useUrlTab(allowed, param = 'tab') {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const fallback = allowed[0]

  const raw = searchParams.get(param)
  const value = allowed.includes(raw) ? raw : fallback

  const setValue = useCallback(
    (next) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === fallback) params.delete(param)
      else params.set(param, next)
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [searchParams, pathname, router, fallback, param],
  )

  return [value, setValue]
}
