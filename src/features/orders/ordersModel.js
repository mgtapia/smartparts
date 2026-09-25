// Modelo puro de las órdenes de compra: totales, cobertura de un pedido del
// cliente por las compras a proveedores y margen estimado. Sin React ni
// Firestore: recibe las órdenes ya leídas (forma de los repos) y devuelve datos
// para la UI. Todo el dinero en enteros (Money / micros), porcentajes en basis
// points.
import { money, multiplyMoney, roundHalfUp, sumMoney, toMicros } from '@libs/money'
import { clpToUsd, toUsdMicro, usdMicroToClp } from '@libs/fx'
import { CLIENT_ORDER_STATUS, PURCHASE_ORDER_STATUS } from '@constants/enums'

/**
 * @typedef {import('@libs/money').Money} Money
 *
 * @typedef {Object} ClientOrderLine
 * @property {string} id
 * @property {string} partId
 * @property {number} qty
 * @property {Money|null} unitPrice   Precio de venta acordado, en la moneda de la OC.
 * @property {string} fulfillment     'purchase' (hoy siempre) | 'stock' (reservado).
 *
 * @typedef {Object} ClientOrderLink
 * @property {string} clientOrderId
 * @property {string} lineId
 * @property {number} qty
 *
 * @typedef {Object} PurchaseOrderLine
 * @property {string} id
 * @property {string} partId
 * @property {number} qty
 * @property {Money|null} unitPrice   Precio del proveedor, en la moneda de la OC.
 * @property {string|null} quoteLineId
 * @property {ClientOrderLink[]} clientOrderLinks
 *
 * @typedef {Object} PurchaseOrder
 * @property {string} id
 * @property {string} supplierId
 * @property {string|null} number
 * @property {string} status
 * @property {string|null} incoterm
 * @property {string} currency
 * @property {PurchaseOrderLine[]} lines
 */

/** Una OC anulada no cubre nada ni cuenta en los totales de compra. */
export const isActivePurchaseOrder = (po) => po.status !== PURCHASE_ORDER_STATUS.CANCELLED
export const isActiveClientOrder = (order) => order.status !== CLIENT_ORDER_STATUS.CANCELLED

export const COVERAGE = Object.freeze({
  EMPTY: 'empty', // la OC no tiene líneas
  NONE: 'none',
  PARTIAL: 'partial',
  FULL: 'full',
  OVER: 'over', // se compró más de lo pedido: no debería pasar, la UI lo impide
})

/**
 * Total de una lista de líneas `{ qty, unitPrice }` en `currency`. Las líneas
 * sin precio no suman y se cuentan en `missingPrice`.
 * @param {Array<{ qty: number, unitPrice: Money|null }>} lines
 * @param {string} currency
 * @returns {{ total: Money, missingPrice: number }}
 */
export function ordersTotal(lines, currency) {
  const priced = lines.filter((l) => l.unitPrice)
  return {
    total: sumMoney(
      priced.map((l) => multiplyMoney(l.unitPrice, l.qty)),
      currency,
    ),
    missingPrice: lines.length - priced.length,
  }
}

/**
 * Lleva un Money a micros de otra moneda pasando por USD con el tipo de cambio
 * de `fx`. Null si la conversión no está soportada (p. ej. a CNY).
 * @param {Money} m
 * @param {string} target
 * @param {{ usdClp: number, cnyUsd: number }} fx
 * @returns {{ micros: number, converted: boolean }|null}
 */
export function toCurrencyMicros(m, target, fx) {
  if (m.currency === target) return { micros: toMicros(m), converted: false }
  let usdMicro
  if (m.currency === 'CLP') usdMicro = toMicros(clpToUsd(m, fx))
  else if (m.currency === 'USD' || m.currency === 'CNY') usdMicro = toUsdMicro(m, fx)
  else return null
  if (target === 'USD') return { micros: usdMicro, converted: true }
  if (target === 'CLP') return { micros: toMicros(usdMicroToClp(usdMicro, fx)), converted: true }
  return null
}

/**
 * Líneas de compra enlazadas a cada línea de OC del cliente, solo de OC de
 * proveedor vigentes.
 * @param {PurchaseOrder[]} purchaseOrders
 * @returns {Map<string, Array<{ purchaseOrder: PurchaseOrder, purchaseLine: PurchaseOrderLine, qty: number }>>}
 *   clave: id de la línea del cliente.
 */
export function linksByClientLine(purchaseOrders) {
  const map = new Map()
  for (const po of purchaseOrders) {
    if (!isActivePurchaseOrder(po)) continue
    for (const line of po.lines) {
      for (const link of line.clientOrderLinks ?? []) {
        if (!map.has(link.lineId)) map.set(link.lineId, [])
        map.get(link.lineId).push({ purchaseOrder: po, purchaseLine: line, qty: link.qty })
      }
    }
  }
  return map
}

/** Estado de cobertura de una cantidad pedida contra la cubierta. */
export function coverageStatus(qty, coveredQty) {
  if (coveredQty <= 0) return COVERAGE.NONE
  if (coveredQty < qty) return COVERAGE.PARTIAL
  if (coveredQty === qty) return COVERAGE.FULL
  return COVERAGE.OVER
}

/**
 * Cobertura y margen estimado de cada línea de una OC del cliente.
 *
 * Margen = venta de lo cubierto − costo de compra de lo cubierto, en la moneda
 * de la OC del cliente. El costo de compra es el PRECIO DEL PROVEEDOR con su
 * Incoterm (normalmente EXW), no el costo puesto en Chile: sin flete, seguro,
 * arancel ni gastos locales. Por eso el margen es siempre una estimación.
 *
 * @param {{ currency: string, lines: ClientOrderLine[] }} order
 * @param {PurchaseOrder[]} purchaseOrders  Todas las OC de proveedor (se filtran las anuladas).
 * @param {{ usdClp: number, cnyUsd: number }} fx
 */
export function clientOrderCoverage(order, purchaseOrders, fx) {
  const byLine = linksByClientLine(purchaseOrders)
  const lines = order.lines.map((line) => {
    const links = byLine.get(line.id) ?? []
    const coveredQty = links.reduce((s, l) => s + l.qty, 0)
    let costMicros = 0
    let costComplete = true
    let converted = false
    for (const link of links) {
      const price = link.purchaseLine.unitPrice
      const conv = price ? toCurrencyMicros(price, order.currency, fx) : null
      if (!conv) {
        costComplete = false
        continue
      }
      costMicros += conv.micros * link.qty
      converted = converted || conv.converted
    }
    const saleMicros = line.unitPrice ? toMicros(line.unitPrice) * coveredQty : null
    const margin =
      coveredQty > 0 && saleMicros !== null && costComplete
        ? marginOf(saleMicros, costMicros, order.currency)
        : null
    return {
      line,
      links,
      coveredQty,
      remainingQty: Math.max(line.qty - coveredQty, 0),
      status: coverageStatus(line.qty, coveredQty),
      costComplete,
      converted,
      costMicros: costComplete ? costMicros : null,
      margin,
    }
  })

  const orderedQty = lines.reduce((s, l) => s + l.line.qty, 0)
  const coveredQty = lines.reduce((s, l) => s + Math.min(l.coveredQty, l.line.qty), 0)
  const status =
    lines.length === 0
      ? COVERAGE.EMPTY
      : lines.some((l) => l.status === COVERAGE.OVER)
        ? COVERAGE.OVER
        : lines.every((l) => l.status === COVERAGE.FULL)
          ? COVERAGE.FULL
          : coveredQty > 0
            ? COVERAGE.PARTIAL
            : COVERAGE.NONE

  // Margen de la OC: solo las líneas con margen calculable (cubiertas, con
  // precio de venta y todos sus costos con precio).
  const withMargin = lines.filter((l) => l.margin)
  const margin =
    withMargin.length === 0
      ? null
      : marginOf(
          withMargin.reduce((s, l) => s + l.margin.saleMicros, 0),
          withMargin.reduce((s, l) => s + l.margin.costMicros, 0),
          order.currency,
        )

  return {
    lines,
    orderedQty,
    coveredQty,
    status,
    margin,
    // Líneas cubiertas (total o parcial) que no entran al margen por falta de un precio.
    marginMissing: lines.filter((l) => l.coveredQty > 0 && !l.margin).length,
    converted: lines.some((l) => l.converted),
  }
}

/**
 * @param {number} saleMicros
 * @param {number} costMicros
 * @param {string} currency
 */
export function marginOf(saleMicros, costMicros, currency) {
  const marginMicros = saleMicros - costMicros
  return {
    saleMicros,
    costMicros,
    marginMicros,
    currency,
    // Margen sobre la venta, en basis points. Sin venta no hay porcentaje. Se
    // divide antes de multiplicar: con montos grandes en CLP, micros × 10000
    // pasaría del rango de enteros seguros.
    marginBp: saleMicros > 0 ? roundHalfUp((marginMicros / saleMicros) * 10000) : null,
  }
}

/**
 * Cuánto queda por cubrir de cada línea de OC del cliente, sin contar los
 * enlaces de `excludePurchaseLineId` (la línea de compra que se está
 * editando: sus enlaces actuales se pueden reasignar).
 * @param {{ lines: ClientOrderLine[] }} order
 * @param {PurchaseOrder[]} purchaseOrders
 * @param {string|null} excludePurchaseLineId
 * @returns {Map<string, number>}  id de línea del cliente → cantidad disponible.
 */
export function remainingByClientLine(order, purchaseOrders, excludePurchaseLineId = null) {
  const others = purchaseOrders.map((po) => ({
    ...po,
    lines: po.lines.filter((l) => l.id !== excludePurchaseLineId),
  }))
  const byLine = linksByClientLine(others)
  const map = new Map()
  for (const line of order.lines) {
    const covered = (byLine.get(line.id) ?? []).reduce((s, l) => s + l.qty, 0)
    map.set(line.id, Math.max(line.qty - covered, 0))
  }
  return map
}

/**
 * Valida los enlaces de una línea de compra: cantidades enteras positivas, que
 * no superen lo que falta cubrir de cada línea del cliente, y que la suma no
 * supere la cantidad comprada.
 * @param {number} purchaseQty
 * @param {ClientOrderLink[]} links
 * @param {Map<string, number>} remaining  id de línea del cliente → disponible.
 * @returns {string|null}  El problema, en español, o null si está bien.
 */
export function validateLinks(purchaseQty, links, remaining) {
  let sum = 0
  for (const link of links) {
    if (!Number.isInteger(link.qty) || link.qty <= 0) return 'Cantidad enlazada inválida'
    if (link.qty > (remaining.get(link.lineId) ?? 0)) {
      return 'Se enlaza más de lo que falta cubrir del pedido'
    }
    sum += link.qty
  }
  if (sum > purchaseQty) return 'Se enlaza más de lo que se compra'
  return null
}

/**
 * Precio de una línea de cotización para una cantidad: el tramo por volumen de
 * mayor cantidad mínima que la cantidad alcanza; sin tramos, el precio base.
 * Null si la cotización no tiene moneda.
 * @param {{ price: { amount: number, currency: string|null }, priceTiers?: Array<{ minQty: number, amountMinor: number }> }} quote
 * @param {number} qty
 * @returns {Money|null}
 */
export function quotePriceForQty(quote, qty) {
  if (!quote?.price?.currency) return null
  const tier = [...(quote.priceTiers ?? [])]
    .filter((t) => t.minQty <= qty)
    .sort((a, b) => b.minQty - a.minQty)[0]
  return money(tier ? tier.amountMinor : quote.price.amount, quote.price.currency)
}

/**
 * Una línea de OC del cliente no se puede borrar si alguna compra la enlaza,
 * aunque esa compra esté anulada: el enlace quedaría apuntando a nada.
 */
export function isClientLineLinked(lineId, purchaseOrders) {
  return purchaseOrders.some((po) =>
    po.lines.some((l) => (l.clientOrderLinks ?? []).some((link) => link.lineId === lineId)),
  )
}
