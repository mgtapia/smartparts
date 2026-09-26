import { useDeferredValue, useMemo, useState } from 'react'
import { useQuotationsData } from '@features/quotes/hooks/useQuotations'
import { useCostAssumptions } from '@features/quotes/hooks/useCostAssumptions'
import { usePersistentState } from '@hooks/usePersistentState'
import { DEFAULT_PARAM_SET, DEFAULT_FX } from '@mocks/costParams'
import {
  cheapestScenario,
  QUANTITY_SOURCE,
  simulateStrategies,
  vehicleQuantityRows,
} from '../orderSimulationModel'

/**
 * Simulación de un pedido completo del cliente: por defecto, todos los repuestos cotizados del
 * vehículo con más cotizaciones, con la cantidad que estimó el cliente. Devuelve los escenarios
 * de compra (mejor combinación de proveedores y cada proveedor solo). Comparte modo, tarifas y
 * supuestos con Cotizaciones.
 */
export function useOrderSimulation() {
  const { lines, loading, error } = useQuotationsData()
  const assumptions = useCostAssumptions()
  const { rates, settingsFor } = assumptions

  const [quantitySource, setQuantitySource] = usePersistentState(
    'order.quantitySource.v1',
    QUANTITY_SOURCE.CLIENT_ESTIMATE,
  )
  // Cantidades editadas por repuesto (las que no se tocan siguen la fuente elegida).
  const [quantityOverrides, setQuantityOverrides] = usePersistentState('order.quantities.v1', {})
  // El plan prueba todas las combinaciones de proveedores: se recalcula con las cantidades
  // diferidas para que escribir en el editor no se trabe.
  const deferredOverrides = useDeferredValue(quantityOverrides)
  const [chosenVehicleId, setVehicleId] = useState(null)
  const [scenarioId, setScenarioId] = useState(null)

  // Vehículos con cotizaciones, del que tiene más repuestos cotizados al que menos.
  const vehicles = useMemo(() => {
    const byId = new Map()
    for (const { part } of lines) {
      if (!part.vehicleId) continue
      const entry = byId.get(part.vehicleId) ?? { vehicle: part.vehicle, parts: new Set() }
      entry.parts.add(part.id)
      byId.set(part.vehicleId, entry)
    }
    return [...byId.entries()]
      .map(([id, e]) => ({ id, vehicle: e.vehicle, partCount: e.parts.size }))
      .sort((a, b) => b.partCount - a.partCount)
  }, [lines])
  const vehicleId = chosenVehicleId ?? vehicles[0]?.id ?? null

  const simulation = useMemo(() => {
    if (!vehicleId) return null
    return simulateStrategies({
      lines,
      vehicleId,
      quantitySource,
      quantityOverrides: deferredOverrides,
      settingsFor,
      assumptions: rates,
      params: DEFAULT_PARAM_SET,
      fx: DEFAULT_FX,
    })
  }, [lines, vehicleId, quantitySource, deferredOverrides, settingsFor, rates])

  const quantityRows = useMemo(
    () => vehicleQuantityRows({ lines, vehicleId, quantitySource, quantityOverrides }),
    [lines, vehicleId, quantitySource, quantityOverrides],
  )
  /** Fija la cantidad de un repuesto; `null` vuelve a la cantidad por defecto. */
  const setQuantity = (partId, qty) =>
    setQuantityOverrides((prev) => {
      const next = { ...prev }
      if (qty === null) delete next[partId]
      else next[partId] = qty
      return next
    })
  const resetQuantities = () => setQuantityOverrides({})

  // Sin elección, el escenario más barato entre los que cubren más repuestos.
  const scenario =
    simulation?.scenarios.find((s) => s.id === scenarioId) ??
    (simulation ? cheapestScenario(simulation.scenarios) : null)

  // Repuesto y cotización por id, para mostrar el detalle del reparto.
  const lookup = useMemo(() => {
    const parts = new Map()
    const quotes = new Map()
    for (const { part, quote } of lines) {
      parts.set(part.id, part)
      quotes.set(quote.id, quote)
    }
    return { parts, quotes }
  }, [lines])

  return {
    loading,
    error,
    assumptions,
    vehicles,
    vehicleId,
    setVehicleId,
    quantitySource,
    setQuantitySource,
    simulation,
    quantityRows,
    setQuantity,
    resetQuantities,
    scenario,
    setScenarioId,
    lookup,
  }
}
