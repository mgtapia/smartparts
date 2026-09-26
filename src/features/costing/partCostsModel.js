// Mejor costo unitario en Chile por repuesto, calculado para un modo de envío: función pura, sin
// React ni Firebase. Sirve para poner lado a lado el costo aéreo y el marítimo (catálogo, ficha
// del repuesto). Es el costo variable de cada oferta: los gastos que se cobran por embarque
// (despacho, guía aérea, reparto y mínimos) no se prorratean acá, porque dependen de qué más se
// compre. Todo el dinero va en micros de USD (enteros).
import { money } from '@libs/money'
import { toUsdMicro } from '@libs/fx'
import { computeUnitCost } from '@core/costing/unitCost'

/** Quién pide qué: solo pieza original, o lo más barato sea cual sea su calidad. */
export const SELECTIONS = Object.freeze({ OEM: 'original', CHEAPEST: 'cheapest' })

const isShipmentFee = (c) => c.basis === 'per_shipment' || c.basis === 'percent_plus_fixed'

/**
 * @param {Object} input
 * @param {any[]} input.parts       Repuestos con `quotes`, peso y volumen.
 * @param {any[]} input.suppliers   Proveedores (para el Formulario F).
 * @param {(supplierId: string) => any} input.settingsFor  Distancia y supuestos de cada proveedor en este modo.
 * @param {any} input.rates         Supuestos de costo unitario.
 * @param {any} input.params        Set de parámetros fiscales.
 * @param {any} input.fx
 * @param {string} input.mode       Uno de SHIPPING_MODES.
 * @param {Set<string>|string[]} [input.skipKeys]  Ofertas atípicas (`partId|supplierId|calidad`) que no cuentan.
 * @returns {Record<string, { original?: Best, cheapest?: Best }>}
 *   `Best` = `{ usdMicro, supplierId, quality }`, el menor costo de esa selección.
 */
export function buildPartCosts({
  parts,
  suppliers,
  settingsFor,
  rates,
  params,
  fx,
  mode,
  skipKeys,
}) {
  const skip = new Set(skipKeys ?? [])
  const supplierById = new Map(suppliers.map((s) => [s.id, s]))
  const assumptions = {
    ...rates,
    shipmentCharges: rates.shipmentCharges.map((c) => ({
      ...c,
      amountCents: isShipmentFee(c) ? 0 : c.amountCents,
      minCents: c.minCents == null ? c.minCents : 0,
    })),
  }

  const result = {}
  for (const part of parts) {
    if (!(part.weightG > 0) || !(part.volumeCm3 > 0)) continue

    // Una oferta por proveedor y calidad: la de menor precio, sin las inferidas.
    const cheapestQuotes = new Map()
    for (const q of part.quotes ?? []) {
      if (q.inferred || !q.currency || !supplierById.has(q.supplierId)) continue
      if (skip.has(`${part.id}|${q.supplierId}|${q.partType}`)) continue
      const key = `${q.supplierId}|${q.partType}`
      const usdMicro = toUsdMicro(q.price, fx)
      const prev = cheapestQuotes.get(key)
      if (!prev || usdMicro < prev.usdMicro) cheapestQuotes.set(key, { q, usdMicro })
    }

    for (const { q } of cheapestQuotes.values()) {
      const settings = settingsFor(q.supplierId)
      const unit = computeUnitCost({
        unitPrice: money(q.price.amount, q.price.currency),
        incoterm: q.incoterm ?? null,
        originDistanceKm: settings.originDistanceKm,
        originDistanceConfirmed: settings.originDistanceConfirmed,
        originFallback: settings.originFallback,
        formF: supplierById.get(q.supplierId)?.facts?.formF?.value ?? 'unknown',
        weightG: part.weightG,
        dgProfile: part.dgProfile ?? undefined,
        volumeCm3: part.volumeCm3,
        logisticsConfirmed: false,
        mode,
        assumptions,
        params,
        fx,
      })
      if (unit.landedNetUsdMicro == null) continue
      const best = {
        usdMicro: unit.landedNetUsdMicro,
        supplierId: q.supplierId,
        quality: q.partType,
      }
      const byPart = (result[part.id] ??= {})
      if (
        q.partType === SELECTIONS.OEM &&
        (!byPart.original || best.usdMicro < byPart.original.usdMicro)
      ) {
        byPart.original = best
      }
      if (!byPart.cheapest || best.usdMicro < byPart.cheapest.usdMicro) byPart.cheapest = best
    }
  }
  return result
}

/** Costo más barato de la selección pedida, o null si ese repuesto no tiene oferta costeable. */
export const bestOf = (costs, partId, selection) => costs?.[partId]?.[selection] ?? null

/**
 * ¿Conviene importar? Compara el costo puesto en Chile con lo que el cliente paga hoy por el
 * repuesto (mismo criterio que la compra de prueba). Sin costo o sin precio de referencia no se
 * puede decir: devuelve null.
 * @param {number|null} costClp
 * @param {number|null} baselineClp
 */
export function convenience(costClp, baselineClp) {
  if (costClp == null || baselineClp == null || baselineClp <= 0) return null
  return costClp <= baselineClp
}

/** Modos que se comparan lado a lado. */
export const COST_MODES = Object.freeze({ AIR: 'air', SEA: 'sea' })

/**
 * Recomendación de un repuesto: para cada selección (solo original, o lo más barato) y cada modo,
 * el mejor costo puesto en Chile, cuánto se aleja del precio de referencia y si conviene. Además
 * elige la opción más barata que conviene, o dice que ninguna conviene.
 *
 * @param {{ air: any, sea: any }} costs  Salida de `buildPartCosts` por modo.
 * @param {string} partId
 * @param {number|null} baselineClp  Precio de referencia (lo que paga hoy el cliente).
 * @param {(usdMicro: number) => number} toClp
 * @returns {{ options: Option[], pick: Option|null }}
 *   `Option` = `{ selection, mode, best, costClp, diffBp, worthIt }`; `diffBp` es (costo − referencia)
 *   sobre la referencia, en basis points (negativo = ahorro).
 */
export function buildRecommendations(costs, partId, baselineClp, toClp) {
  const options = []
  for (const selection of [SELECTIONS.OEM, SELECTIONS.CHEAPEST]) {
    for (const mode of [COST_MODES.AIR, COST_MODES.SEA]) {
      const best = bestOf(costs?.[mode], partId, selection)
      const costClp = best ? toClp(best.usdMicro) : null
      const worthIt = convenience(costClp, baselineClp)
      const diffBp =
        costClp != null && baselineClp > 0
          ? Math.round(((costClp - baselineClp) * 10000) / baselineClp)
          : null
      options.push({ selection, mode, best, costClp, diffBp, worthIt })
    }
  }
  const viable = options.filter((o) => o.worthIt)
  const pick = viable.length ? viable.reduce((a, b) => (b.costClp < a.costClp ? b : a)) : null
  return { options, pick }
}

/**
 * Cuántos repuestos conviene importar por cada modo: su mejor costo puesto en Chile no supera lo
 * que el cliente paga hoy. Solo cuentan los que tienen costo y precio de referencia.
 *
 * @param {{ air: any, sea: any }} costs  Salida de `buildPartCosts` por modo.
 * @param {Array<{ id: string, baselinePrice?: { amount: number } }>} parts
 * @param {(usdMicro: number) => number} toClp
 * @param {string} [selection]
 * @returns {{ air: { worth: number, total: number }, sea: { worth: number, total: number } }}
 */
export function worthImportingCounts(costs, parts, toClp, selection = SELECTIONS.CHEAPEST) {
  const count = (mode) => {
    let worth = 0
    let total = 0
    for (const part of parts) {
      const best = bestOf(costs?.[mode], part.id, selection)
      const verdict = best
        ? convenience(toClp(best.usdMicro), part.baselinePrice?.amount ?? null)
        : null
      if (verdict === null) continue
      total += 1
      if (verdict) worth += 1
    }
    return { worth, total }
  }
  return { air: count(COST_MODES.AIR), sea: count(COST_MODES.SEA) }
}
