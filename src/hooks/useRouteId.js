'use client'

import { usePathname } from 'next/navigation'

/**
 * Id de la ficha abierta, leído de la URL (`/parts/abc` → `abc`). La plataforma se
 * publica como sitio estático y las fichas comparten una sola página generada, así
 * que el id no puede venir de los parámetros del servidor sino de la dirección.
 */
export function useRouteId() {
  const segment = usePathname().split('/').filter(Boolean)[1]
  return segment ? decodeURIComponent(segment) : null
}
