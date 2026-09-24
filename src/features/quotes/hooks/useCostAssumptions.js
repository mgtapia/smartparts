import { useCallback, useMemo } from 'react'
import { usePersistentState } from '@hooks/usePersistentState'
import { SHIPPING_MODES } from '@constants/enums'
import { DEFAULT_UNIT_COST_ASSUMPTIONS } from '@mocks/costParams'

const { defaultOriginCostBp, generalDutyBp, ftaDutyBp, ...DEFAULT_RATES } =
  DEFAULT_UNIT_COST_ASSUMPTIONS
// Los aranceles son parámetros globales fijos (no dependen del proveedor ni de la
// cotización): no se editan ni se guardan por navegador.
const FIXED_DUTIES = { generalDutyBp, ftaDutyBp }

/**
 * Supuestos editables del costo unitario: modo de envío, tarifas, arancel TLC
 * supuesto y, por proveedor, costo de origen y si emite Form F. Todo es una
 * estimación del equipo (se muestra en rojo) y se guarda por navegador hasta
 * que existan cotizaciones reales de forwarder y un set de parámetros
 * verificado en Firestore.
 */
export function useCostAssumptions() {
  const [mode, setMode] = usePersistentState('quotes.mode', SHIPPING_MODES.SEA_LCL)
  const [storedRates, setRates] = usePersistentState('quotes.rates.v2', DEFAULT_RATES)
  const [supplierSettings, setSupplierSettings] = usePersistentState(
    'quotes.supplierSettings.v2',
    {},
  )

  // Un valor guardado de una versión anterior puede no tener claves nuevas.
  const rates = useMemo(
    () => ({ ...DEFAULT_RATES, ...storedRates, ...FIXED_DUTIES }),
    [storedRates],
  )

  const settingsFor = useCallback(
    (supplierId) => ({
      originCostBp: defaultOriginCostBp,
      formF: 'unknown',
      // Incoterm que se supone cuando la cotización no lo indica ('none' = no suponer).
      assumedIncoterm: 'none',
      ...supplierSettings[supplierId],
    }),
    [supplierSettings],
  )

  const updateSupplier = (supplierId, patch) =>
    setSupplierSettings((prev) => ({ ...prev, [supplierId]: { ...prev[supplierId], ...patch } }))

  // Solo los parámetros generales: lo de cada proveedor se edita en su cotización.
  const reset = () => setRates(DEFAULT_RATES)

  return { mode, setMode, rates, setRates, settingsFor, updateSupplier, reset }
}
