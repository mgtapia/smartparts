import { useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { listVehicles } from '@libs/repos/vehiclesRepo'
import { listParts } from '@libs/repos/partsRepo'
import { useQuotationsData } from '@features/quotes/hooks/useQuotations'

/**
 * Vehículos con sus repuestos y las cotizaciones que los incluyen. De cada
 * cotización se conservan solo las líneas de ese vehículo. Todo sale de la
 * caché compartida.
 */
export function useVehicles() {
  const vehicles = useCachedQuery('vehicles', listVehicles)
  const parts = useCachedQuery('parts', listParts)
  const { quotations, loading: quotesLoading, error: quotesError } = useQuotationsData()

  const loading = vehicles.loading || parts.loading || quotesLoading
  const error = vehicles.error || parts.error || quotesError

  const rows = useMemo(() => {
    if (loading || error) return []
    return (vehicles.data ?? []).map((vehicle) => {
      const own = (parts.data ?? []).filter((p) => p.vehicleId === vehicle.id)
      const ownQuotations = quotations
        .map((q) => {
          const lines = q.lines.filter((l) => l.part.vehicleId === vehicle.id)
          return { ...q, lines, partCount: new Set(lines.map((l) => l.part.id)).size }
        })
        .filter((q) => q.lines.length > 0)
      const quotedIds = new Set(ownQuotations.flatMap((q) => q.lines.map((l) => l.part.id)))
      return {
        vehicle,
        parts: own,
        quotations: ownQuotations,
        quotedIds,
        supplierCount: new Set(ownQuotations.map((q) => q.supplierId)).size,
      }
    })
  }, [loading, error, vehicles.data, parts.data, quotations])

  return { rows, loading, error }
}
