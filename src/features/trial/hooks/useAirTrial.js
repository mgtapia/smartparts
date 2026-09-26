import { useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { listParts } from '@libs/repos/partsRepo'
import { listSuppliers } from '@libs/repos/suppliersRepo'
import { DEFAULT_FX, DEFAULT_PARAM_SET } from '@mocks/costParams'
import { useCostAssumptions } from '@features/quotes/hooks/useCostAssumptions'
import { useSourcingVehicle } from '@features/vehicles/hooks/useSourcingVehicle'
import { buildAirTrial } from '../airTrialModel'

/**
 * Análisis de la compra de prueba por avión del vehículo en sourcing. Usa los mismos supuestos de
 * costo que la Calculadora (tarifa aérea, gastos por embarque, distancia de cada proveedor), así
 * que editarlos allá cambia este análisis. Todo viene de la caché compartida.
 */
export function useAirTrial() {
  const parts = useCachedQuery('parts', listParts)
  const suppliers = useCachedQuery('suppliers', listSuppliers)
  const sourcing = useSourcingVehicle()
  const { rates, settingsFor } = useCostAssumptions()

  const loading = parts.loading || suppliers.loading || sourcing.loading
  const error = parts.error || suppliers.error || sourcing.error

  const data = useMemo(() => {
    if (loading || error || !sourcing.vehicleId) return null
    return buildAirTrial({
      parts: (parts.data ?? []).filter((p) => p.vehicleId === sourcing.vehicleId),
      suppliers: suppliers.data ?? [],
      settingsFor,
      rates,
      params: DEFAULT_PARAM_SET,
      fx: DEFAULT_FX,
    })
  }, [loading, error, sourcing.vehicleId, parts.data, suppliers.data, settingsFor, rates])

  return { data, loading, error }
}
