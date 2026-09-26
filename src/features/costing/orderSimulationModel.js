// Simulación de un pedido completo del cliente: arma la canasta (repuestos de un vehículo con
// su cantidad) y las ofertas de cada proveedor desde las cotizaciones, y las pasa al plan de
// compra (`planPurchase`). Función pura: sin React ni Firebase.
import { planPurchase } from '@core/costing/purchasePlan'
import { PART_TYPE, SHIPPING_MODES, SHIPPING_MODE_LABELS_ES } from '@constants/enums'
import { roundHalfUp, toMicros } from '@libs/money'
import { unitPriceForQty } from './orderModel'

export const QUALITY = { ANY: 'any', OEM: PART_TYPE.ORIGINAL, AFM: PART_TYPE.ALTERNATIVE }

/** De dónde salen las cantidades del pedido. */
export const QUANTITY_SOURCE = { CLIENT_ESTIMATE: 'client_estimate', ONE_EACH: 'one_each' }

/** Cantidad de un repuesto según la fuente elegida, sin las ediciones del usuario. */
export function defaultQuantity(part, quantitySource) {
  return quantitySource === QUANTITY_SOURCE.ONE_EACH ? 1 : Number(part.quantityEstimated) || 0
}

/**
 * Repuestos cotizados de un vehículo con su cantidad por defecto y la vigente (la editada si
 * hay), para el editor de cantidades. Orden alfabético.
 * @returns {Array<{ part: any, defaultQty: number, qty: number, edited: boolean }>}
 */
export function vehicleQuantityRows({ lines, vehicleId, quantitySource, quantityOverrides }) {
  const parts = new Map()
  for (const { part } of lines) if (part.vehicleId === vehicleId) parts.set(part.id, part)
  return [...parts.values()]
    .sort((a, b) => a.nameEs.localeCompare(b.nameEs, 'es'))
    .map((part) => {
      const defaultQty = defaultQuantity(part, quantitySource)
      const edited = quantityOverrides?.[part.id] !== undefined
      return { part, defaultQty, qty: edited ? quantityOverrides[part.id] : defaultQty, edited }
    })
}

/** Precio que paga hoy el cliente (neto, CLP) llevado a micros de USD. */
function baselineUsdMicro(part, fx) {
  const baseline = part.baselinePrice
  if (!baseline || baseline.currency !== 'CLP') return null
  return roundHalfUp((toMicros(baseline) * 1e6) / fx.usdClp)
}

/**
 * @param {Object} input
 * @param {Array<{ part: any, quote: any }>} input.lines   Líneas de cotización con su repuesto.
 * @param {string} [input.vehicleId]  Canasta por vehículo: sus repuestos con la cantidad estimada.
 * @param {Array<{ partId: string, qty: number, baselineUsdMicro?: number|null }>} [input.basket]
 *   Canasta explícita (p. ej. lo que falta comprar de una OC del cliente): manda sobre
 *   `vehicleId` y `quantitySource`; su cantidad decide el tramo de precio. Si trae
 *   `baselineUsdMicro`, ese es el precio de venta unitario en vez del precio base del repuesto.
 * @param {string} input.quality          Ver QUALITY.
 * @param {string} [input.quantitySource]   Ver QUANTITY_SOURCE.
 * @param {Record<string, number>} [input.quantityOverrides]  Cantidades editadas por repuesto en la
 *   canasta por vehículo: mandan sobre la fuente de cantidades; 0 saca el repuesto del pedido.
 * @param {(supplierId: string) => any} input.settingsFor  Supuestos por proveedor (distancia, Incoterm supuesto).
 * @param {any} input.fx
 */
export function buildPlanInputs({
  lines,
  vehicleId,
  basket,
  quality,
  quantitySource,
  quantityOverrides,
  settingsFor,
  fx,
}) {
  const basketByPart = basket ? new Map(basket.map((b) => [b.partId, b])) : null
  const partsById = new Map()
  const offers = []
  const supplierIds = new Set()
  let inferredOffers = 0
  let partsWithoutQty = 0

  for (const { part, quote } of lines) {
    const inBasket = basketByPart?.get(part.id)
    if (basketByPart ? !inBasket : part.vehicleId !== vehicleId) continue
    if (!partsById.has(part.id)) {
      const qty = inBasket
        ? inBasket.qty
        : (quantityOverrides?.[part.id] ?? defaultQuantity(part, quantitySource))
      if (qty <= 0) {
        partsWithoutQty += 1
        partsById.set(part.id, null)
      } else {
        partsById.set(part.id, {
          partId: part.id,
          qty,
          weightG: part.weightG,
          dgProfile: part.dgProfile ?? undefined,
          volumeCm3: part.volumeCm3,
          baselineUsdMicro:
            inBasket && 'baselineUsdMicro' in inBasket
              ? (inBasket.baselineUsdMicro ?? null)
              : baselineUsdMicro(part, fx),
        })
      }
    }
    const planPart = partsById.get(part.id)
    if (!planPart) continue
    if (quality !== QUALITY.ANY && quote.partType !== quality) continue
    const priced = unitPriceForQty(quote, planPart.qty)
    if (!priced) continue
    const settings = settingsFor(quote.supplierId)
    const incoterm =
      quote.incoterm ?? (settings.assumedIncoterm !== 'none' ? settings.assumedIncoterm : null)
    if (quote.inferred) inferredOffers += 1
    supplierIds.add(quote.supplierId)
    offers.push({
      offerId: quote.id,
      partId: part.id,
      supplierId: quote.supplierId,
      partType: quote.partType,
      unitPrice: priced.price,
      incoterm,
    })
  }

  const suppliers = [...supplierIds].map((id) => {
    const settings = settingsFor(id)
    const supplier = lines.find((l) => l.quote.supplierId === id)?.quote.supplier
    return {
      id,
      originDistanceKm: settings.originDistanceKm,
      originFallback: settings.originFallback,
      formF: supplier?.facts?.formF?.value ?? 'unknown',
    }
  })
  const parts = [...partsById.values()].filter(Boolean)
  // Repuestos de la canasta que ningún proveedor cotizó: no entran a ningún escenario.
  const partsWithoutQuote = basketByPart
    ? [...basketByPart.keys()].filter((id) => !partsById.has(id))
    : []
  return { parts, offers, suppliers, notes: { inferredOffers, partsWithoutQty, partsWithoutQuote } }
}

/**
 * Canasta + plan: los escenarios de compra (mejor combinación, mejor con N proveedores y cada
 * proveedor solo) para el vehículo, la calidad y las cantidades elegidas.
 */
export function simulateOrder({ mode, assumptions, params, ...rest }) {
  const inputs = buildPlanInputs({ ...rest, fx: rest.fx })
  const plan = planPurchase({
    parts: inputs.parts,
    offers: inputs.offers,
    suppliers: inputs.suppliers,
    mode,
    assumptions,
    params,
    fx: rest.fx,
  })
  const units = inputs.parts.reduce((acc, p) => acc + p.qty, 0)
  return { ...plan, parts: inputs.parts, offers: inputs.offers, notes: inputs.notes, units }
}

// Escenarios por estrategia de ahorro. Lo que se decide es QUÉ se compra (solo originales o lo
// más económico de cualquier calidad) y CÓMO se envía (marítimo o aéreo). Dentro de cada uno, el
// plan elige solo la mejor combinación de proveedores; en marítimo, además, el formato más barato
// entre LCL y contenedor completo.
export const TRANSPORT = { SEA: 'sea', AIR: 'air' }
const TRANSPORT_LABEL_ES = { [TRANSPORT.SEA]: 'Marítimo', [TRANSPORT.AIR]: 'Aéreo' }
const TRANSPORT_MODES = {
  [TRANSPORT.SEA]: [SHIPPING_MODES.SEA_LCL, SHIPPING_MODES.SEA_FCL_20, SHIPPING_MODES.SEA_FCL_40HQ],
  [TRANSPORT.AIR]: [SHIPPING_MODES.AIR],
}
export const STRATEGIES = [
  { id: 'oem', quality: QUALITY.OEM, labelEs: 'Originales' },
  { id: 'cheapest', quality: QUALITY.ANY, labelEs: 'Más económico' },
]

/** Gana el que cubre más repuestos y, a igual cobertura, el de menor costo final. */
export function isBetterPlan(a, b) {
  if (!b) return true
  if (a.coveredPartIds.length !== b.coveredPartIds.length) {
    return a.coveredPartIds.length > b.coveredPartIds.length
  }
  return (a.cost.totals.landedNet ?? Infinity) < (b.cost.totals.landedNet ?? Infinity)
}

/**
 * Escenario más barato entre los que cubren más repuestos (el que se propone por defecto).
 * @param {Array<{ id: string, coveredPartIds: string[], cost: any }>} scenarios
 */
export function cheapestScenario(scenarios) {
  return scenarios.reduce((best, s) => (isBetterPlan(s, best) ? s : best), null)
}

/**
 * Los cuatro escenarios de ahorro (originales o más económico, por mar o por aire) de una
 * canasta, cada uno con su mejor combinación de proveedores. Mismo contrato que `simulateOrder`
 * para la pantalla: `{ blockers, scenarios, parts, offers, notes, units }`.
 * @param {Object} input  Como `buildPlanInputs` (sin `quality`) más `assumptions` y `params`.
 */
export function simulateStrategies({ assumptions, params, ...rest }) {
  const scenarios = []
  const blockers = new Set()
  let base = null
  for (const strategy of STRATEGIES) {
    const inputs = buildPlanInputs({ ...rest, quality: strategy.quality })
    base ??= inputs
    for (const transport of Object.values(TRANSPORT)) {
      let chosen = null
      for (const mode of TRANSPORT_MODES[transport]) {
        const plan = planPurchase({
          parts: inputs.parts,
          offers: inputs.offers,
          suppliers: inputs.suppliers,
          mode,
          assumptions,
          params,
          fx: rest.fx,
          onlyBest: true,
        })
        plan.blockers.forEach((b) => blockers.add(b))
        const best = plan.scenarios[0]
        if (best && isBetterPlan(best, chosen?.plan)) chosen = { mode, plan: best }
      }
      if (!chosen) continue
      scenarios.push({
        ...chosen.plan,
        id: `${strategy.id}-${transport}`,
        kind: 'strategy',
        strategyId: strategy.id,
        transport,
        mode: chosen.mode,
        label: `${strategy.labelEs} · ${TRANSPORT_LABEL_ES[transport]}`,
        modeLabel: SHIPPING_MODE_LABELS_ES[chosen.mode],
      })
    }
  }
  const units = base.parts.reduce((acc, p) => acc + p.qty, 0)
  return {
    blockers: scenarios.length === 0 ? [...blockers] : [],
    scenarios,
    parts: base.parts,
    offers: base.offers,
    notes: base.notes,
    units,
  }
}
