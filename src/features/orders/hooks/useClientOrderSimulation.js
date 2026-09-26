import { useDeferredValue, useMemo, useState } from 'react'
import { usePersistentState } from '@hooks/usePersistentState'
import { supplierLabel } from '@features/quotes/constants'
import { useQuotationsData } from '@features/quotes/hooks/useQuotations'
import { useCostAssumptions } from '@features/quotes/hooks/useCostAssumptions'
import {
  DEFAULT_CUSTOM,
  cheapestScenario,
  simulateStrategies,
} from '@features/costing/orderSimulationModel'
import { basketFromClientOrder, scenarioMargin } from '../purchaseFromOrderModel'

/**
 * Simulación de compra de una OC del cliente: la canasta es lo que aún no cubre ninguna compra
 * vigente (`basketFromClientOrder`), no todos los repuestos de un vehículo. Comparte modo,
 * tarifas y supuestos con Cotizaciones y con la Calculadora.
 *
 * @param {Object} order  OC del cliente.
 * @param {Object[]} purchaseOrders  Todas las OC a proveedores (cuentan las vigentes).
 */
export function useClientOrderSimulation(order, purchaseOrders) {
  const { lines, loading, error } = useQuotationsData()
  const assumptions = useCostAssumptions()
  const { rates, params, settingsFor, fx } = assumptions
  const [scenarioId, setScenarioId] = useState(null)
  // Escenario personalizado (calidad, envío y proveedores), guardado en el navegador.
  const [custom, setCustom] = usePersistentState('clientOrder.custom.v1', DEFAULT_CUSTOM)
  const deferredCustom = useDeferredValue(custom)

  const basket = useMemo(
    () => basketFromClientOrder(order, purchaseOrders, fx),
    [order, purchaseOrders, fx],
  )

  const simulation = useMemo(() => {
    if (basket.basket.length === 0) return null
    return simulateStrategies({
      custom: deferredCustom,
      lines,
      basket: basket.basket,
      settingsFor,
      assumptions: rates,
      params,
      fx,
    })
  }, [lines, basket, deferredCustom, settingsFor, rates, params, fx])

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

  // Venta y margen de cada escenario contra el precio acordado en la OC.
  const saleByScenario = useMemo(
    () =>
      new Map((simulation?.scenarios ?? []).map((s) => [s.id, scenarioMargin(s, basket.entries)])),
    [simulation, basket],
  )

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
    basket,
    simulation,
    custom,
    setCustom,
    supplierOptions,
    scenario,
    setScenarioId,
    lookup,
    saleFor: (s) => saleByScenario.get(s.id),
  }
}
