import { useCallback, useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { listClients } from '@libs/repos/clientsRepo'
import { listClientOrders } from '@libs/repos/clientOrdersRepo'
import { listPurchaseOrders } from '@libs/repos/purchaseOrdersRepo'
import { listSuppliers } from '@libs/repos/suppliersRepo'
import { listParts } from '@libs/repos/partsRepo'
import { useGlobalSettings } from '@features/settings/hooks/useGlobalSettings'
import { useQuotationsData } from '@features/quotes/hooks/useQuotations'
import { clientOrderCoverage, isActiveClientOrder, ordersTotal } from '../ordersModel'

// Más reciente primero: por fecha de la OC y, sin fecha, al final.
const byDateDesc = (a, b) => (b.order.date ?? '').localeCompare(a.order.date ?? '')

/**
 * Clientes, OC de clientes y OC a proveedores, con lo que cada pantalla
 * necesita ya resuelto: cliente/proveedor de cada OC, totales, cobertura y
 * margen estimado de cada pedido. `reload` vuelve a leer todo tras guardar.
 */
export function useOrders() {
  const clientsQuery = useCachedQuery('clients', listClients)
  const clientOrdersQuery = useCachedQuery('client_orders', listClientOrders)
  const purchaseOrdersQuery = useCachedQuery('purchase_orders', listPurchaseOrders)
  const suppliersQuery = useCachedQuery('suppliers', listSuppliers)
  // Misma clave y lectura que Catálogo y Cotizaciones: se comparte la caché.
  const partsQuery = useCachedQuery('parts', listParts)
  const { quotations } = useQuotationsData()
  const { fx } = useGlobalSettings()

  const queries = [clientsQuery, clientOrdersQuery, purchaseOrdersQuery, suppliersQuery, partsQuery]
  const loading = queries.some((q) => q.loading)
  const error = queries.find((q) => q.error)?.error ?? null

  const data = useMemo(() => {
    const clients = clientsQuery.data ?? []
    const clientOrders = clientOrdersQuery.data ?? []
    const purchaseOrders = purchaseOrdersQuery.data ?? []
    const suppliers = suppliersQuery.data ?? []
    const parts = partsQuery.data ?? []

    const clientsById = new Map(clients.map((c) => [c.id, c]))
    const suppliersById = new Map(suppliers.map((s) => [s.id, s]))
    const partsById = new Map(parts.map((p) => [p.id, p]))
    const quotationsById = new Map(quotations.map((q) => [q.id, q]))

    const clientOrderRows = clientOrders
      .map((order) => ({
        order,
        client: clientsById.get(order.clientId) ?? null,
        ...ordersTotal(order.lines, order.currency),
        coverage: clientOrderCoverage(order, purchaseOrders, fx),
      }))
      .sort(byDateDesc)

    const clientOrdersById = new Map(clientOrders.map((o) => [o.id, o]))
    const purchaseOrderRows = purchaseOrders
      .map((order) => ({
        order,
        supplier: suppliersById.get(order.supplierId) ?? null,
        quotation: order.quotationId ? (quotationsById.get(order.quotationId) ?? null) : null,
        ...ordersTotal(order.lines, order.currency),
        // OC de clientes que esta compra cubre, sin repetir.
        clientOrders: [
          ...new Set(order.lines.flatMap((l) => l.clientOrderLinks.map((k) => k.clientOrderId))),
        ]
          .map((id) => clientOrdersById.get(id))
          .filter(Boolean),
      }))
      .sort(byDateDesc)

    return {
      clients,
      clientsById,
      suppliers,
      suppliersById,
      parts,
      partsById,
      quotations,
      clientOrders,
      // OC de clientes a las que se puede enlazar una compra.
      openClientOrders: clientOrders.filter(isActiveClientOrder),
      purchaseOrders,
      clientOrderRows,
      purchaseOrderRows,
    }
  }, [
    clientsQuery.data,
    clientOrdersQuery.data,
    purchaseOrdersQuery.data,
    suppliersQuery.data,
    partsQuery.data,
    quotations,
    fx,
  ])

  const { reload: reloadClients } = clientsQuery
  const { reload: reloadClientOrders } = clientOrdersQuery
  const { reload: reloadPurchaseOrders } = purchaseOrdersQuery
  const reload = useCallback(
    () => Promise.all([reloadClients(), reloadClientOrders(), reloadPurchaseOrders()]),
    [reloadClients, reloadClientOrders, reloadPurchaseOrders],
  )

  return { ...data, fx, loading, error, reload }
}
