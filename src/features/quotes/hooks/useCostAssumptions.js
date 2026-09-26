import { useMemo, useState } from 'react'
import { usePersistentState } from '@hooks/usePersistentState'
import { SHIPPING_MODES } from '@constants/enums'
import { useGlobalSettings } from '@features/settings/hooks/useGlobalSettings'
import {
  buildRates,
  defaultOriginCostBp,
  pickEditable,
} from '@features/settings/globalSettingsModel'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { listSuppliers } from '@libs/repos/suppliersRepo'

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
  // Los ajustes globales viven en la base (vista Ajustes). Lo que se cambia en los modales de esta
  // pantalla es temporal: pisa a los globales solo mientras la pantalla está abierta.
  const global = useGlobalSettings()
  const [tempRates, setTempRates] = useState(null)
  const [supplierSettings, setSupplierSettings] = usePersistentState(
    'quotes.supplierSettings.v3',
    {},
  )

  const rates = useMemo(() => buildRates(tempRates ?? global.editableRates), [tempRates, global])

  // Un cambio temporal guarda solo los valores editables.
  const setRates = (next) => setTempRates(pickEditable(next))

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
  const reset = () => setTempRates(null)

  return {
    mode,
    setMode,
    rates,
    setRates,
    params: global.params,
    fx: global.fx,
    hasTemporaryChanges: tempRates !== null,
    settingsFor,
    settingsForAir,
    settingsForSea,
    updateSupplier,
    reset,
  }
}
