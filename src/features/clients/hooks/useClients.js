import { useMemo } from 'react'
import { useOrders } from '@features/orders/hooks/useOrders'
import { isActiveClientOrder } from '@features/orders/ordersModel'

/**
 * Clientes con sus OC (las filas de `useOrders`, con totales y cobertura).
 * `reload` vuelve a leer clientes y órdenes después de guardar.
 */
export function useClients() {
  const orders = useOrders()
  const { clients, clientOrderRows } = orders

  const rows = useMemo(
    () =>
      clients
        .map((client) => {
          const own = clientOrderRows.filter((r) => r.order.clientId === client.id)
          return {
            client,
            orders: own,
            openCount: own.filter((r) => isActiveClientOrder(r.order)).length,
            // Filas ordenadas por fecha descendente: la primera con fecha es la última OC.
            lastDate: own.find((r) => r.order.date)?.order.date ?? null,
          }
        })
        .sort((a, b) => (a.client.name ?? '').localeCompare(b.client.name ?? '', 'es')),
    [clients, clientOrderRows],
  )

  return { ...orders, rows }
}
