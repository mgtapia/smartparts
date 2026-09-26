import { useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { SHIPPING_MODES } from '@constants/enums'
import { listParts } from '@libs/repos/partsRepo'
import { listSuppliers } from '@libs/repos/suppliersRepo'
import { usdMicroToClp } from '@libs/fx'
import { DEFAULT_FX, DEFAULT_PARAM_SET } from '@mocks/costParams'
import { useCostAssumptions } from '@features/quotes/hooks/useCostAssumptions'
import { useAirTrial } from '@features/trial/hooks/useAirTrial'
import { buildPartCosts } from '../partCostsModel'

const NO_SUPPLIERS = []
// Función estable (no se recrea en cada render): las pantallas la usan como dependencia.
const toClp = (usdMicro) => usdMicroToClp(usdMicro, DEFAULT_FX).amount

/**
 * Mejor costo unitario en Chile de cada repuesto, en avión y en barco (marítimo LCL) a la vez, con
 * los supuestos de costo vigentes. No bloquea la pantalla: mientras se calcula, `costs` es null.
 * Las ofertas que la compra de prueba marca como atípicas no cuentan.
 *
 * `toClp(usdMicro)` da pesos chilenos enteros para comparar con el precio de referencia.
 */
export function usePartCosts() {
  const parts = useCachedQuery('parts', listParts)
  const suppliers = useCachedQuery('suppliers', listSuppliers)
  const { data: trial } = useAirTrial()
  const { rates, settingsForAir, settingsForSea } = useCostAssumptions()

  const costs = useMemo(() => {
    if (!parts.data || !suppliers.data) return null
    const base = {
      parts: parts.data,
      suppliers: suppliers.data,
      rates,
      params: DEFAULT_PARAM_SET,
      fx: DEFAULT_FX,
      skipKeys: trial?.suspectOfferKeys,
    }
    return {
      air: buildPartCosts({ ...base, settingsFor: settingsForAir, mode: SHIPPING_MODES.AIR }),
      sea: buildPartCosts({ ...base, settingsFor: settingsForSea, mode: SHIPPING_MODES.SEA_LCL }),
    }
  }, [parts.data, suppliers.data, trial, rates, settingsForAir, settingsForSea])

  return { costs, suppliers: suppliers.data ?? NO_SUPPLIERS, toClp, rates }
}
