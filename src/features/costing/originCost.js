import { ORIGIN_COST_ESTIMATE } from '@mocks/costParams'

/**
 * Gasto de origen EXW → FOB estimado según la distancia de la fábrica al puerto o
 * aeropuerto de embarque: una parte fija (despacho de exportación y manejo) más una
 * variable por cada 100 km de transporte interno. Es una estimación del equipo, sin fuente.
 * Sin distancia devuelve null.
 * @param {number|null} km
 * @returns {number|null} basis points del precio EXW
 */
export function estimateOriginCostBp(km) {
  if (!Number.isFinite(km) || km < 0) return null
  const { baseBp, bpPer100Km } = ORIGIN_COST_ESTIMATE
  return baseBp + Math.round((km * bpPer100Km) / 100)
}
