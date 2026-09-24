import { useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { listParts } from '@libs/repos/partsRepo'
import { getMilestone } from '@libs/repos/milestoneRepo'
import { useQuotationsData } from '@features/quotes/hooks/useQuotations'
import { useCostAssumptions } from '@features/quotes/hooks/useCostAssumptions'
import { useSuppliers } from '@features/suppliers/hooks/useSuppliers'
import { buildPending } from '../pendingModel'
import { useSourcingVehicle } from '@features/vehicles/hooks/useSourcingVehicle'

/**
 * Pendientes de la etapa de sourcing: junta repuestos, cotizaciones, proveedores,
 * supuestos de costo y el hito, y los resume con `buildPending`. Todo viene de
 * la caché compartida, así que abrirlo después de otra pantalla no vuelve a leer.
 */
export function usePending() {
  const parts = useCachedQuery('parts', listParts)
  const sourcing = useSourcingVehicle()
  const milestone = useCachedQuery(`milestone:${sourcing.vehicleId}`, () =>
    getMilestone(sourcing.vehicleId),
  )
  const { quotations, loading: quotesLoading, error: quotesError } = useQuotationsData()
  const { rows, loading: suppliersLoading, error: suppliersError } = useSuppliers()
  const assumptions = useCostAssumptions()
  const { mode, rates, settingsFor } = assumptions

  const loading =
    parts.loading || sourcing.loading || milestone.loading || quotesLoading || suppliersLoading
  const error = parts.error || sourcing.error || milestone.error || quotesError || suppliersError

  const data = useMemo(() => {
    if (loading || error) return null
    return buildPending({
      vehicleId: sourcing.vehicleId,
      parts: parts.data ?? [],
      quotations,
      suppliers: rows.map((r) => r.supplier),
      assumptions: { mode, rates, settingsFor },
      milestone: milestone.data ?? {},
    })
  }, [
    loading,
    error,
    sourcing.vehicleId,
    parts.data,
    quotations,
    rows,
    mode,
    rates,
    settingsFor,
    milestone.data,
  ])

  return {
    data,
    loading,
    error,
    vehicleId: sourcing.vehicleId,
    reloadMilestone: milestone.reload,
  }
}
