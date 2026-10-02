import { useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { listParts } from '@libs/repos/partsRepo'
import { listSuppliers } from '@libs/repos/suppliersRepo'
import { useCostAssumptions } from '@features/quotes/hooks/useCostAssumptions'
import { useSourcingVehicle } from '@features/vehicles/hooks/useSourcingVehicle'
import { pricingFor } from '@features/costing/pricingModel'
import { buildPriceReview } from '../priceReviewModel'

/**
 * Tabla de precios consolidada del vehículo en sourcing: costo aéreo y marítimo en varios
 * escenarios, al lado del PVP que ya calcula la fórmula actual. Mismos supuestos de costo que
 * Carga completa y la Compra de prueba.
 * @param {string|null} probableSupplierId
 * @param {'sea_fcl_20'|'sea_fcl_40hq'} seaMode
 * @param {'original'|'cheapest'} option
 */
export function usePriceReview(requestedSupplierId, seaMode, option) {
  const parts = useCachedQuery('parts', listParts)
  const suppliers = useCachedQuery('suppliers', listSuppliers)
  const sourcing = useSourcingVehicle()
  const { rates, params, settingsForAir, settingsForSea, fx } = useCostAssumptions()

  const loading = parts.loading || suppliers.loading || sourcing.loading
  const error = parts.error || suppliers.error || sourcing.error

  const pricingAir = useMemo(() => pricingFor(rates, 'air'), [rates])
  const pricingSea = useMemo(() => pricingFor(rates, 'sea'), [rates])

  // Sin selección explícita: Henan Ronglai por defecto (nuestro proveedor principal hoy), o el
  // primero que haya si no está.
  const probableSupplierId =
    requestedSupplierId ??
    suppliers.data?.find((s) => s.alias === 'Henan Ronglai')?.id ??
    suppliers.data?.[0]?.id ??
    null

  const { data, buildError } = useMemo(() => {
    if (loading || error || !sourcing.vehicleId || !probableSupplierId) {
      return { data: null, buildError: null }
    }
    try {
      return {
        data: buildPriceReview({
          parts: (parts.data ?? []).filter((p) => p.vehicleId === sourcing.vehicleId),
          suppliers: suppliers.data ?? [],
          probableSupplierId,
          settingsForAir,
          settingsForSea,
          rates,
          params,
          fx,
          pricingAir,
          pricingSea,
          seaMode,
          option,
        }),
        buildError: null,
      }
    } catch (err) {
      // No debería pasar con datos válidos — si pasa, se ve en la consola y la página muestra un
      // error en vez de quedar en blanco.
      console.error('usePriceReview: buildPriceReview falló', err)
      return { data: null, buildError: err }
    }
  }, [
    loading,
    error,
    sourcing.vehicleId,
    probableSupplierId,
    parts.data,
    suppliers.data,
    settingsForAir,
    settingsForSea,
    rates,
    params,
    pricingAir,
    pricingSea,
    fx,
    seaMode,
    option,
  ])

  return {
    data,
    suppliers: suppliers.data ?? [],
    probableSupplierId,
    loading,
    error: error || buildError,
  }
}
