import { useMemo } from 'react'
import { usePersistentState } from '@hooks/usePersistentState'
import { SHIPPING_MODES } from '@constants/enums'
import { DEFAULT_UNIT_COST_ASSUMPTIONS, SHIPMENT_CHARGES } from '@mocks/costParams'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { listSuppliers } from '@libs/repos/suppliersRepo'

const { defaultOriginCostBp, generalDutyBp, ftaDutyBp, ...DEFAULT_RATES } =
  DEFAULT_UNIT_COST_ASSUMPTIONS
// Los aranceles son parámetros globales fijos (no dependen del proveedor ni de la
// cotización): no se editan ni se guardan por navegador.
const FIXED_DUTIES = { generalDutyBp, ftaDutyBp }
// Lo que se edita en pantalla y se guarda por navegador: tarifas, tamaño del embarque y gastos.
const EDITABLE_KEYS = Object.keys(DEFAULT_RATES)

/**
 * Supuestos de cada proveedor para un modo: distancia al puerto o aeropuerto (`factKey`, de su
 * ficha) y lo que se editó en pantalla encima.
 */
function buildSettingsFor(suppliers, factKey, supplierSettings) {
  const distanceBySupplier = new Map(
    (suppliers ?? []).map((s) => {
      const fact = s.facts?.[factKey]
      const km = Number(fact?.value ?? Number.NaN)
      return [s.id, { km: Number.isFinite(km) && km >= 0 ? km : null, confirmed: !!fact?.source }]
    }),
  )
  // Distancia promedio de los proveedores con dato: base del supuesto para los que no tienen.
  const known = [...distanceBySupplier.values()].map((d) => d.km).filter((km) => km != null)
  const averageKm = known.length ? known.reduce((a, b) => a + b, 0) / known.length : null

  return (supplierId) => {
    const distance = distanceBySupplier.get(supplierId) ?? { km: null, confirmed: false }
    return {
      // Distancia al puerto o aeropuerto, desde la ficha del proveedor: el costo unitario
      // calcula con ella el transporte en China.
      originDistanceKm: distance.km,
      originDistanceConfirmed: distance.confirmed,
      // Sin distancia: el mayor entre el 3 % del precio y el transporte con la distancia
      // promedio. Con cero, el proveedor sin datos saldría más barato que los que sí tienen.
      originFallback: { bp: defaultOriginCostBp, averageKm },
      // Incoterm que se supone cuando la cotización no lo indica ('none' = no suponer).
      assumedIncoterm: 'none',
      ...supplierSettings[supplierId],
    }
  }
}

/**
 * Supuestos editables del costo unitario: modo de envío, tarifas, arancel TLC
 * supuesto y, por proveedor, costo de origen y si emite Form F. Todo es una
 * estimación del equipo (se muestra en rojo) y se guarda por navegador hasta
 * que existan cotizaciones reales de forwarder y un set de parámetros
 * verificado en Firestore.
 */
export function useCostAssumptions() {
  const [mode, setMode] = usePersistentState('quotes.mode', SHIPPING_MODES.SEA_LCL)
  const [storedRates, setStoredRates] = usePersistentState('quotes.rates.v3', DEFAULT_RATES)
  const [supplierSettings, setSupplierSettings] = usePersistentState(
    'quotes.supplierSettings.v3',
    {},
  )

  // Un valor guardado de una versión anterior puede no tener claves nuevas. Los gastos por
  // embarque son la lista de referencia con los valores editados en pantalla encima.
  const rates = useMemo(() => {
    const merged = { ...DEFAULT_RATES, ...storedRates, ...FIXED_DUTIES }
    const overrides = merged.chargeOverrides ?? {}
    // Contenedores: los tipos que falten en lo guardado toman el valor de referencia.
    const fclContainers = Object.fromEntries(
      Object.entries(DEFAULT_RATES.fclContainers).map(([key, spec]) => [
        key,
        { ...spec, ...storedRates?.fclContainers?.[key] },
      ]),
    )
    return {
      ...merged,
      fclContainers,
      shipmentCharges: SHIPMENT_CHARGES.map((c) => ({ ...c, ...overrides[c.code] })),
    }
  }, [storedRates])

  // Solo se guardan los valores editables; los aranceles fijos y la lista armada no.
  const setRates = (next) =>
    setStoredRates(Object.fromEntries(EDITABLE_KEYS.map((key) => [key, next[key]])))

  // Distancia de cada proveedor al puerto (marítimo) o aeropuerto (aéreo) de embarque, en km.
  const { data: suppliers } = useCachedQuery('suppliers', listSuppliers)
  const isAir = mode === SHIPPING_MODES.AIR || mode === SHIPPING_MODES.COURIER
  // Se arman los supuestos de ambos modos: hay pantallas que muestran el costo aéreo y el
  // marítimo a la vez, sin depender del modo elegido en los parámetros.
  const settingsForAir = useMemo(
    () => buildSettingsFor(suppliers, 'airportDistanceKm', supplierSettings),
    [suppliers, supplierSettings],
  )
  const settingsForSea = useMemo(
    () => buildSettingsFor(suppliers, 'portDistanceKm', supplierSettings),
    [suppliers, supplierSettings],
  )
  const settingsFor = isAir ? settingsForAir : settingsForSea

  const updateSupplier = (supplierId, patch) =>
    setSupplierSettings((prev) => ({ ...prev, [supplierId]: { ...prev[supplierId], ...patch } }))

  // Solo los parámetros generales: lo de cada proveedor se edita en su cotización.
  const reset = () => setStoredRates(DEFAULT_RATES)

  return {
    mode,
    setMode,
    rates,
    setRates,
    settingsFor,
    settingsForAir,
    settingsForSea,
    updateSupplier,
    reset,
  }
}
