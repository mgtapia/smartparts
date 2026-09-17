// Prorrateo de conceptos entre líneas de un embarque.
// Regla mixta (NO todo por valor) — ver docs/MOTOR-DE-COSTOS.md.
import { allocateByWeights, equalSplit } from '../../libs/money'

/**
 * @typedef {'by_cif_value'|'by_fob_value'|'by_chargeable_units'|'by_volume'|'equal_split'|'direct'} AllocationBasis
 */

/**
 * @typedef {Object} AllocationContext
 * @property {number[]} fobPerLine
 * @property {number[]} cifPerLine
 * @property {number[]} chargeableUnitsPerLine
 * @property {number[]} volumePerLine
 * @property {boolean[]} [isTarget]  Para 'direct': qué líneas reciben el concepto (p.ej. solo las DG).
 */

/**
 * Reparte `totalMicros` entre líneas según la base indicada.
 * @param {number} totalMicros
 * @param {AllocationBasis} basis
 * @param {AllocationContext} ctx
 * @returns {number[]}
 */
export function allocate(totalMicros, basis, ctx) {
  switch (basis) {
    case 'by_fob_value':
      return allocateByWeights(totalMicros, ctx.fobPerLine)
    case 'by_cif_value':
      return allocateByWeights(totalMicros, ctx.cifPerLine)
    case 'by_chargeable_units':
      return allocateByWeights(totalMicros, ctx.chargeableUnitsPerLine)
    case 'by_volume':
      return allocateByWeights(totalMicros, ctx.volumePerLine)
    case 'equal_split':
      return equalSplit(totalMicros, ctx.fobPerLine.length)
    case 'direct': {
      const weights = ctx.fobPerLine.map((_, i) => (ctx.isTarget?.[i] ? 1 : 0))
      return allocateByWeights(totalMicros, weights)
    }
    default:
      throw new Error(`Base de prorrateo desconocida: ${basis}`)
  }
}
