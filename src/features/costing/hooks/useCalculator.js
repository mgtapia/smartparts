import { useMemo, useState } from 'react'
import { useQuotationsData } from '@features/quotes/hooks/useQuotations'
import { useCostAssumptions } from '@features/quotes/hooks/useCostAssumptions'
import { usePersistentState } from '@hooks/usePersistentState'
import { DEFAULT_PARAM_SET, DEFAULT_FX } from '@mocks/costParams'
import { buildOrder } from '../orderModel'

/** Margen por defecto sobre el costo, en basis points (20 %). Editable. */
export const DEFAULT_MARGIN_BP = 2000

/**
 * Calculadora de costo de un repuesto: elige repuesto, cotización y cantidades, y
 * calcula el costo puesto en Chile de cada cantidad como una OC de un solo repuesto
 * (`buildOrder` → `costShipment`, el mismo modelo del simulador de pedido completo, con los
 * gastos por embarque enteros). Comparte supuestos y parámetros con Cotizaciones.
 */
export function useCalculator(initialPartId) {
  const { lines, loading, error } = useQuotationsData()
  const assumptions = useCostAssumptions()
  const { mode, rates, settingsFor } = assumptions

  const [chosenPartId, setPartId] = useState(initialPartId)
  const [chosenQuoteId, setQuoteId] = useState(null)
  // Cantidades a comparar; una vacía (null) no se calcula hasta que se escribe.
  const [quantities, setQuantities] = usePersistentState('costing.quantities.v1', [1])
  const [marginBp, setMarginBp] = usePersistentState('costing.marginBp.v1', DEFAULT_MARGIN_BP)

  const parts = useMemo(() => {
    const byId = new Map()
    for (const l of lines) if (!byId.has(l.part.id)) byId.set(l.part.id, l.part)
    return [...byId.values()].sort((a, b) => a.nameEs.localeCompare(b.nameEs, 'es'))
  }, [lines])

  const part = parts.find((p) => p.id === chosenPartId) ?? parts[0] ?? null
  const partQuotes = useMemo(
    () => (part ? lines.filter((l) => l.part.id === part.id).map((l) => l.quote) : []),
    [lines, part],
  )
  const quote = partQuotes.find((q) => q.id === chosenQuoteId) ?? partQuotes[0] ?? null

  const orders = useMemo(() => {
    if (!part || !quote) return []
    return quantities.map((qty) =>
      qty
        ? {
            qty,
            order: buildOrder({
              part,
              quote,
              qty,
              supplier: quote.supplier,
              mode,
              settings: settingsFor(quote.supplierId),
              assumptions: rates,
              marginBp,
              params: DEFAULT_PARAM_SET,
              fx: DEFAULT_FX,
            }),
          }
        : { qty: null, order: null },
    )
  }, [part, quote, quantities, mode, rates, settingsFor, marginBp])

  return {
    loading,
    error,
    assumptions,
    parts,
    part,
    setPartId: (id) => {
      setPartId(id)
      setQuoteId(null)
    },
    partQuotes,
    quote,
    setQuoteId,
    quantities,
    setQuantities,
    marginBp,
    setMarginBp,
    orders,
  }
}
