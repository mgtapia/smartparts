import { useDeferredValue, useMemo, useState } from 'react'
import { supplierLabel } from '@features/quotes/constants'
import { useQuotationsData } from '@features/quotes/hooks/useQuotations'
import { useCostAssumptions } from '@features/quotes/hooks/useCostAssumptions'
import { usePersistentState } from '@hooks/usePersistentState'
import {
  DEFAULT_CUSTOM,
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
  const { rates, params, settingsFor, fx } = assumptions

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
  // Escenario personalizado (calidad, envío y proveedores), guardado en el navegador.
  const [custom, setCustom] = usePersistentState('order.custom.v1', DEFAULT_CUSTOM)
  const deferredCustom = useDeferredValue(custom)

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
      custom: deferredCustom,
      lines,
      vehicleId,
      quantitySource,
      quantityOverrides: deferredOverrides,
      settingsFor,
      assumptions: rates,
      params,
      fx,
    })
  }, [
    fx,
    lines,
    vehicleId,
    quantitySource,
    deferredOverrides,
    deferredCustom,
    settingsFor,
    rates,
    params,
  ])

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
  // Proveedores con cotizaciones, para elegir cuáles incluir en el escenario personalizado.
  const supplierOptions = useMemo(
    () =>
      [
        ...new Map(
          lines.map((l) => [
            l.quote.supplierId,
            supplierLabel(l.quote.supplier, l.quote.supplierId),
          ]),
        ),
      ].map(([id, name]) => ({ id, name })),
    [lines],
  )

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
    custom,
    setCustom,
    supplierOptions,
    quantityRows,
    setQuantity,
    resetQuantities,
    scenario,
    setScenarioId,
    lookup,
  }
}
