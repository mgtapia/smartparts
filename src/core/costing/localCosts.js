// Evaluación del catálogo de conceptos de costo local (agente de aduanas,
// almacenaje, THC, etc). Ver docs/MOTOR-DE-COSTOS.md §Catálogo de conceptos.
import { toMicros } from '../../libs/money'

/**
 * Evalúa un concepto de costo local y devuelve su monto en micros USD.
 * @param {import('./types').LocalCostConcept} concept
 * @param {{ cifTotalMicro: number, chargeableUnitsTotalMicro: number, warehousingDays: number }} ctx
 * @returns {number} micros
 */
export function evaluateLocalCost(concept, ctx) {
  switch (concept.type) {
    case 'fixed':
      return toMicros(concept.amount)
    case 'fixed_per_unit':
      return toMicros(concept.amount) * (ctx.warehousingDays || 1)
    case 'percent': {
      const rate = concept.rateBp / 10000
      return Math.round(ctx.cifTotalMicro * rate)
    }
    case 'percent_with_min': {
      const rate = concept.rateBp / 10000
      const pct = Math.round(ctx.cifTotalMicro * rate)
      const min = toMicros(concept.min)
      return Math.max(pct, min)
    }
    default:
      throw new Error(`Tipo de concepto de costo local desconocido: ${concept.type}`)
  }
}

/**
 * Evalúa todos los conceptos aplicables al modo de envío dado.
 * @param {import('./types').LocalCostConcept[]} concepts
 * @param {import('./types').ShippingMode} mode
 * @param {{ cifTotalMicro: number, chargeableUnitsTotalMicro: number, warehousingDays: number }} ctx
 * @returns {{ code: string, labelEs: string, amountMicro: number, allocation: string }[]}
 */
export function evaluateAllLocalCosts(concepts, mode, ctx) {
  return concepts
    .filter((c) => !c.appliesToModes || c.appliesToModes.includes(mode))
    .map((c) => ({
      code: c.code,
      labelEs: c.labelEs,
      amountMicro: evaluateLocalCost(c, ctx),
      allocation: c.allocation,
    }))
}
