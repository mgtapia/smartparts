import { useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { listParts } from '@libs/repos/partsRepo'
import { listSuppliers } from '@libs/repos/suppliersRepo'
import { useCostAssumptions } from '@features/quotes/hooks/useCostAssumptions'
import { useSourcingVehicle } from '@features/vehicles/hooks/useSourcingVehicle'
import { pricingFor } from '@features/costing/pricingModel'
import { buildFullShipment } from '../fullShipmentModel'

/**
 * Análisis de la carga completa por FCL del vehículo en sourcing: mismos supuestos de costo que
 * la Calculadora y la Compra de prueba, pero con la distancia al puerto (no al aeropuerto) de
 * cada proveedor, sin importar el modo que haya quedado elegido en otras pantallas.
 * @param {'sea_fcl_20'|'sea_fcl_40hq'} mode
 */
export function useFullShipment(mode) {
  const parts = useCachedQuery('parts', listParts)
  const suppliers = useCachedQuery('suppliers', listSuppliers)
  const sourcing = useSourcingVehicle()
  const { rates, params, settingsForSea, fx } = useCostAssumptions()

  const loading = parts.loading || suppliers.loading || sourcing.loading
  const error = parts.error || suppliers.error || sourcing.error

  const pricing = useMemo(() => pricingFor(rates, 'sea'), [rates])

  const data = useMemo(() => {
    if (loading || error || !sourcing.vehicleId) return null
    return buildFullShipment({
      parts: (parts.data ?? []).filter((p) => p.vehicleId === sourcing.vehicleId),
      suppliers: suppliers.data ?? [],
      settingsFor: settingsForSea,
      rates,
      params,
      fx,
      pricing,
      mode,
    })
  }, [
    loading,
    error,
    sourcing.vehicleId,
    parts.data,
    suppliers.data,
    settingsForSea,
    rates,
    params,
    pricing,
    fx,
    mode,
  ])

  return { data, loading, error }
}
