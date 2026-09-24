import { useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { listParts } from '@libs/repos/partsRepo'
import { useQuotationsData } from '@features/quotes/hooks/useQuotations'
import { supplierLabel } from '@features/quotes/constants'
import { useSuppliers } from '@features/suppliers/hooks/useSuppliers'
import { SOURCING_VEHICLE_ID } from '@features/pending/constants'
import { buildAnalytics } from '../analyticsModel'

/**
 * Métricas para decidir con quién comprar, según la calidad elegida. Todo sale
 * de la caché compartida, así que abrir la vista general después de otra pantalla
 * no vuelve a leer.
 */
export function useAnalytics(quality) {
  const parts = useCachedQuery('parts', listParts)
  const { lines, loading: quotesLoading, error: quotesError } = useQuotationsData()
  const { rows, loading: suppliersLoading, error: suppliersError } = useSuppliers()

  const loading = parts.loading || quotesLoading || suppliersLoading
  const error = parts.error || quotesError || suppliersError

  const data = useMemo(() => {
    if (loading || error) return null
    const suppliers = new Map(rows.map((r) => [r.supplier.id, r.supplier]))
    return buildAnalytics({
      vehicleId: SOURCING_VEHICLE_ID,
      parts: parts.data ?? [],
      lines,
      quality,
      supplierName: (id) => supplierLabel(suppliers.get(id), id),
    })
  }, [loading, error, parts.data, lines, rows, quality])

  return { data, loading, error }
}
