import { useMemo, useState } from 'react'
import { useQuotationsData } from '@features/quotes/hooks/useQuotations'
import { useCostAssumptions } from '@features/quotes/hooks/useCostAssumptions'
import { usePersistentState } from '@hooks/usePersistentState'
import { DEFAULT_PARAM_SET, DEFAULT_FX } from '@mocks/costParams'
import { QUALITY, simulateOrder } from '@features/costing/orderSimulationModel'
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
  const { mode, rates, settingsFor } = assumptions
  const [quality, setQuality] = usePersistentState('clientOrder.quality.v1', QUALITY.ANY)
  const [scenarioId, setScenarioId] = useState('best')

  const basket = useMemo(
    () => basketFromClientOrder(order, purchaseOrders, DEFAULT_FX),
    [order, purchaseOrders],
  )

  const simulation = useMemo(() => {
    if (basket.basket.length === 0) return null
    return simulateOrder({
      lines,
      basket: basket.basket,
      quality,
      settingsFor,
      mode,
      assumptions: rates,
      params: DEFAULT_PARAM_SET,
      fx: DEFAULT_FX,
    })
  }, [lines, basket, quality, settingsFor, mode, rates])

  const scenario =
    simulation?.scenarios.find((s) => s.id === scenarioId) ?? simulation?.scenarios[0] ?? null

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
    quality,
    setQuality,
    basket,
    simulation,
    scenario,
    setScenarioId,
    lookup,
    saleFor: (s) => saleByScenario.get(s.id),
  }
}
