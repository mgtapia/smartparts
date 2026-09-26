// Precio de venta neto de un repuesto a partir de su costo puesto en Chile y de lo que el cliente
// paga hoy por él. Función pura, sin React ni Firebase. Todo en pesos chilenos enteros y en basis
// points: nunca decimales.
//
// La regla (de Diego): el precio es el MAYOR entre dos cosas.
//   objetivo = precio de hoy × (1 − ahorro máximo del cliente)   50 % en original, 70 % en alternativo
//   piso     = costo ÷ (1 − margen mínimo)                        margen sobre el precio de venta
// El cliente nunca ahorra más que el máximo (no regalamos margen) y nosotros nunca ganamos menos
// que el mínimo. Según cuál gane, la línea cae en un tramo.

/** Tramos: A el cliente ahorra el máximo; B rige el margen mínimo pero aún ahorra; C no compite. */
export const TIERS = Object.freeze({ MAX_SAVING: 'A', MIN_MARGIN: 'B', NOT_COMPETITIVE: 'C' })

export const TIER_LABELS_ES = Object.freeze({
  [TIERS.MAX_SAVING]: 'Ahorro máximo',
  [TIERS.MIN_MARGIN]: 'Ahorro parcial',
  [TIERS.NOT_COMPETITIVE]: 'No competitivo',
})

const BP = 10000
/** Los precios se redondean a la centena de pesos. */
const roundToHundreds = (n) => Math.round(n / 100) * 100

/**
 * Parámetros de precio de un modo de envío, desde los supuestos globales.
 * @param {any} rates  Supuestos de costo (`pvpMargin*Bp`, `pvpMaxSaving*Bp`, `pvpMinSavingBp`).
 * @param {'air'|'sea'} mode
 */
export const pricingFor = (rates, mode) => ({
  minMarginBp: mode === 'air' ? rates.pvpMarginAirBp : rates.pvpMarginSeaBp,
  maxSavingOemBp: rates.pvpMaxSavingOemBp,
  maxSavingAltBp: rates.pvpMaxSavingAltBp,
  minSavingBp: rates.pvpMinSavingBp,
})

/**
 * @param {Object} input
 * @param {number} input.costClp       Costo puesto en Chile, sin IVA.
 * @param {number|null} input.baselineClp  Lo que el cliente paga hoy; sin él solo rige el piso.
 * @param {'original'|'alternative'} input.quality
 * @param {{ minMarginBp: number, maxSavingOemBp: number, maxSavingAltBp: number, minSavingBp: number }} input.pricing
 * @returns {{ priceClp: number, tier: 'A'|'B'|'C'|null, floorClp: number, marginBp: number, savingBp: number|null }}
 *   `marginBp` es la ganancia sobre el precio de venta; `savingBp`, el ahorro del cliente sobre lo que paga hoy.
 */
export function salePrice({ costClp, baselineClp, quality, pricing }) {
  const floorClp = Math.round((costClp * BP) / (BP - pricing.minMarginBp))
  const hasBaseline = baselineClp != null && baselineClp > 0
  const capBp = quality === 'alternative' ? pricing.maxSavingAltBp : pricing.maxSavingOemBp
  const targetClp = hasBaseline ? Math.round((baselineClp * (BP - capBp)) / BP) : 0
  const priceClp = roundToHundreds(Math.max(targetClp, floorClp))

  let tier = null
  if (hasBaseline) {
    if (targetClp >= floorClp) tier = TIERS.MAX_SAVING
    else if (floorClp <= (baselineClp * (BP - pricing.minSavingBp)) / BP) tier = TIERS.MIN_MARGIN
    else tier = TIERS.NOT_COMPETITIVE
  }
  return {
    priceClp,
    tier,
    floorClp,
    marginBp: priceClp > 0 ? Math.round(((priceClp - costClp) * BP) / priceClp) : 0,
    savingBp: hasBaseline ? Math.round(((baselineClp - priceClp) * BP) / baselineClp) : null,
  }
}

/** ¿La línea entra en la oferta? Los tramos A y B sí; C no compite, y sin referencia no se sabe. */
export const isOffered = (tier) => tier === TIERS.MAX_SAVING || tier === TIERS.MIN_MARGIN
