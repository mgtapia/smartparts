// Puente entre la OC del cliente y el simulador de compra, función pura (sin React ni
// Firebase): arma la canasta con lo que aún no está cubierto por compras, calcula la venta y el
// margen de cada escenario contra el precio acordado en la OC, y convierte el escenario elegido
// en una OC por proveedor con sus enlaces a las líneas del cliente.
import { PURCHASE_ORDER_STATUS, FULFILLMENT } from '@constants/enums'
import { unitPriceForQty } from '@features/costing/orderModel'
import { marginOf, remainingByClientLine, toCurrencyMicros, validateLinks } from './ordersModel'

/** Monedas en que se puede emitir una OC a proveedor. */
const PURCHASE_CURRENCIES = ['USD', 'CNY']

/**
 * @typedef {Object} BasketSource
 * @property {string} lineId          Línea de la OC del cliente.
 * @property {number} qty             Unidades aún sin cubrir de esa línea.
 * @property {number|null} unitUsdMicro  Precio de venta unitario en micros de USD; null sin precio.
 *
 * @typedef {Object} BasketEntry      Un repuesto de la canasta (puede venir de varias líneas).
 * @property {string} partId
 * @property {number} qty             Σ de sus fuentes: decide el tramo de precio.
 * @property {BasketSource[]} sources
 */

/**
 * Canasta de compra de una OC del cliente: por repuesto, la cantidad que aún no cubre ninguna
 * compra vigente. Solo entran las líneas `fulfillment: 'purchase'`.
 *
 * Las líneas `stock` quedan fuera a propósito: se despacharían desde inventario propio, no se
 * compran a un proveedor chino. El inventario todavía no existe; cuando exista, esas líneas se
 * descontarán del stock y solo el faltante volverá a la canasta.
 *
 * @param {{ lines: Array<import('./ordersModel').ClientOrderLine>, currency: string }} order
 * @param {Array<import('./ordersModel').PurchaseOrder>} purchaseOrders  Todas las OC a proveedores.
 * @param {{ usdClp: number, cnyUsd: number }} fx
 * @returns {{
 *   entries: BasketEntry[],
 *   basket: Array<{ partId: string, qty: number, baselineUsdMicro: null }>,
 *   remaining: Map<string, number>,
 *   coveredLines: Array<{ line: any, coveredQty: number }>,
 *   stockLines: any[],
 * }}
 */
export function basketFromClientOrder(order, purchaseOrders, fx) {
  const remaining = remainingByClientLine(order, purchaseOrders)
  const byPart = new Map()
  const coveredLines = []
  const stockLines = []
  for (const line of order.lines) {
    if ((line.fulfillment ?? FULFILLMENT.PURCHASE) !== FULFILLMENT.PURCHASE) {
      stockLines.push(line)
      continue
    }
    const left = remaining.get(line.id) ?? 0
    if (left < line.qty) coveredLines.push({ line, coveredQty: line.qty - left })
    if (left <= 0) continue
    const conv = line.unitPrice ? toCurrencyMicros(line.unitPrice, 'USD', fx) : null
    const entry = byPart.get(line.partId) ?? { partId: line.partId, qty: 0, sources: [] }
    entry.qty += left
    entry.sources.push({ lineId: line.id, qty: left, unitUsdMicro: conv ? conv.micros : null })
    byPart.set(line.partId, entry)
  }
  const entries = [...byPart.values()]
  return {
    entries,
    // Sin `baselineUsdMicro`: la venta se calcula con `scenarioMargin`, línea por línea.
    basket: entries.map((e) => ({ partId: e.partId, qty: e.qty, baselineUsdMicro: null })),
    remaining,
    coveredLines,
    stockLines,
  }
}

/**
 * Venta y margen de un escenario contra el precio acordado en la OC del cliente, en micros de
 * USD. La venta suma línea por línea (cada línea con su precio); el costo es el costo final de
 * lo que el escenario compra. Un repuesto con alguna línea sin precio queda fuera de ambos
 * lados y se cuenta en `unpricedPartIds`.
 *
 * @param {{ cost: { lines: Array<{ partId: string, landedNet: number }> } }} scenario
 * @param {BasketEntry[]} entries
 */
export function scenarioMargin(scenario, entries) {
  const entryByPart = new Map(entries.map((e) => [e.partId, e]))
  let saleMicro = 0
  let costMicro = 0
  const unpricedPartIds = []
  for (const line of scenario.cost.lines) {
    const entry = entryByPart.get(line.partId)
    if (!entry) continue
    if (entry.sources.some((s) => s.unitUsdMicro === null)) {
      unpricedPartIds.push(line.partId)
      continue
    }
    saleMicro += entry.sources.reduce((acc, s) => acc + s.unitUsdMicro * s.qty, 0)
    costMicro += line.landedNet
  }
  const margin = saleMicro > 0 || costMicro > 0 ? marginOf(saleMicro, costMicro, 'USD') : null
  return { saleMicro, costMicro, margin, unpricedPartIds }
}

/** Reparte `qty` unidades de un repuesto entre las líneas del cliente que lo piden, en orden. */
function allocateToSources(entry, qty) {
  const links = []
  let left = qty
  for (const source of entry.sources) {
    if (left <= 0) break
    const take = Math.min(source.qty, left)
    if (take > 0) links.push({ lineId: source.lineId, qty: take })
    left -= take
  }
  return { links, unallocated: left }
}

const uniqueOrNull = (values) => {
  const distinct = [...new Set(values.filter(Boolean))]
  return distinct.length === 1 ? distinct[0] : null
}

/**
 * Una OC a proveedor por cada proveedor del escenario, en borrador, con el Incoterm, el lugar y
 * la moneda de su cotización, y cada línea con la cotización de la oferta elegida y los enlaces
 * a las líneas de la OC del cliente por la cantidad asignada. Valida con `validateLinks` que no
 * se cubra más de lo pendiente; si algo falla devuelve el error y ninguna OC (no se crea nada).
 * Sin ids inventados: los asigna Firestore.
 *
 * @param {Object} input
 * @param {{ cost: { lines: Array<{ partId: string, supplierId: string, offerId: string, qty: number }> } }} input.scenario
 * @param {BasketEntry[]} input.entries
 * @param {Map<string, any>} input.quotes   Línea de cotización por id.
 * @param {{ id: string, lines: any[] }} input.order   OC del cliente.
 * @param {Array<import('./ordersModel').PurchaseOrder>} input.purchaseOrders  Las ya creadas.
 * @returns {{ error: string|null, orders: Array<Object> }}
 */
export function buildPurchaseOrders({ scenario, entries, quotes, order, purchaseOrders }) {
  const fail = (error) => ({ error, orders: [] })
  const entryByPart = new Map(entries.map((e) => [e.partId, e]))
  const remaining = remainingByClientLine(order, purchaseOrders)
  const bySupplier = new Map()

  for (const line of scenario.cost.lines) {
    const quote = quotes.get(line.offerId)
    if (!quote) return fail('Falta la cotización de una oferta del escenario')
    const priced = unitPriceForQty(quote, line.qty)
    if (!priced) return fail('Una cotización no tiene moneda: no se puede emitir la OC')
    if (!PURCHASE_CURRENCIES.includes(priced.price.currency)) {
      return fail(`Moneda ${priced.price.currency} no permitida en una OC a proveedor`)
    }
    const entry = entryByPart.get(line.partId)
    if (!entry) return fail('Un repuesto del escenario no está en la OC del cliente')
    const { links, unallocated } = allocateToSources(entry, line.qty)
    if (unallocated > 0) return fail('Se compra más de lo que falta cubrir del pedido')
    const problem = validateLinks(
      line.qty,
      links.map((l) => ({ ...l, clientOrderId: order.id })),
      remaining,
    )
    if (problem) return fail(problem)
    for (const l of links) remaining.set(l.lineId, (remaining.get(l.lineId) ?? 0) - l.qty)

    if (!bySupplier.has(line.supplierId)) bySupplier.set(line.supplierId, [])
    bySupplier.get(line.supplierId).push({
      quote,
      line: {
        partId: line.partId,
        qty: line.qty,
        unitPrice: priced.price,
        quoteLineId: quote.id,
        clientOrderLinks: links.map((l) => ({ clientOrderId: order.id, ...l })),
      },
    })
  }

  const orders = []
  for (const [supplierId, items] of bySupplier) {
    const currencies = [...new Set(items.map((i) => i.line.unitPrice.currency))]
    if (currencies.length > 1) {
      return fail('El proveedor cotizó en más de una moneda: una OC lleva una sola')
    }
    const quoteList = items.map((i) => i.quote)
    orders.push({
      supplierId,
      // Si las líneas vienen de cotizaciones o con condiciones distintas, queda vacío para
      // completarlo en la OC.
      quotationId: uniqueOrNull(quoteList.map((q) => q.quotationId)),
      incoterm: uniqueOrNull(quoteList.map((q) => q.incoterm)),
      incotermPlace: uniqueOrNull(quoteList.map((q) => q.incotermPlace)),
      currency: currencies[0],
      status: PURCHASE_ORDER_STATUS.DRAFT,
      lines: items.map((i) => i.line),
    })
  }
  return { error: null, orders }
}
