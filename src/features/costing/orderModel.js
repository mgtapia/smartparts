// Modelo de la simulación de OC: función pura. Junta las líneas elegidas (cotización
// + cantidad), aplica el tramo de precio que corresponde a cada cantidad, calcula
// el costo con `computeOrderCost` en el modo elegido y en los modos a comparar, y
// suma el precio de venta con el margen. Sin React ni Firebase.
import { computeOrderCost } from '@core/costing/orderCost'
import { CONFIRMED_LOGISTICS_STATUSES, SHIPPING_MODES } from '@constants/enums'
import { money, roundHalfUp } from '@libs/money'

const BP = 10000

/** Modos que se comparan lado a lado con el elegido. */
export const COMPARED_MODES = [SHIPPING_MODES.SEA_LCL, SHIPPING_MODES.AIR]

/**
 * Precio unitario que corresponde a la cantidad: el del mayor tramo alcanzado. Si
 * la cantidad no llega a ningún tramo se usa el más alto, igual que en la
 * comparación de precios. Null si la cotización no tiene moneda.
 * @returns {{ price: import('@libs/money').Money, tierMinQty: number|null } | null}
 */
export function unitPriceForQty(quote, qty) {
  if (!quote.currency) return null
  const reached = quote.priceTiers
    .filter((t) => t.minQty <= qty)
    .sort((a, b) => b.minQty - a.minQty)[0]
  if (reached)
    return { price: money(reached.amountMinor, quote.currency), tierMinQty: reached.minQty }
  const highest = Math.max(quote.price.amount, ...quote.priceTiers.map((t) => t.amountMinor))
  return { price: money(highest, quote.currency), tierMinQty: null }
}

/** Precio de venta: costo más un margen sobre el costo, en basis points. */
export const withMargin = (micro, marginBp) => roundHalfUp((micro * (BP + marginBp)) / BP)

/** Venta total de un resultado: suma de las ventas de cada línea, para que Σ líneas === total. */
const saleOf = (result, marginBp) =>
  result.totals && marginBp != null
    ? result.lines.reduce((sum, l) => sum + withMargin(l.landedNetMicro, marginBp), 0)
    : null

/**
 * @param {Object} input
 * @param {Array<{ id: string, part: any, quote: any, qty: number }>} input.orderLines
 * @param {any} input.supplier
 * @param {string} input.mode
 * @param {{ originCostBp: number|null, assumedIncoterm: string }} input.settings   Supuestos del proveedor.
 * @param {any} input.assumptions   Tarifas y aranceles vigentes.
 * @param {number|null} input.freightQuoteUsdMicro
 * @param {number|null} input.marginBp
 * @param {any} input.params
 * @param {any} input.fx
 */
export function buildOrder({
  orderLines,
  supplier,
  mode,
  settings,
  assumptions,
  freightQuoteUsdMicro,
  marginBp,
  params,
  fx,
}) {
  const resolved = orderLines.map((o) => {
    const priced = unitPriceForQty(o.quote, o.qty)
    const incotermAssumed = !o.quote.incoterm && settings.assumedIncoterm !== 'none'
    return {
      ...o,
      priced,
      incoterm: o.quote.incoterm ?? (incotermAssumed ? settings.assumedIncoterm : null),
      incotermAssumed,
      moqShort: o.quote.moq != null && o.qty < o.quote.moq,
    }
  })

  const costFor = (costMode, freightMicro) => {
    const priceable = resolved.filter((r) => r.priced)
    const result = computeOrderCost({
      mode: costMode,
      lines: priceable.map((r) => ({
        lineId: r.id,
        unitPrice: r.priced.price,
        incoterm: r.incoterm,
        qty: r.qty,
        weightG: r.part.weightG,
        volumeCm3: r.part.volumeCm3,
        logisticsConfirmed: CONFIRMED_LOGISTICS_STATUSES.includes(r.part.logisticsStatus),
        dgProfile: r.part.dgProfile ?? undefined,
      })),
      originCostBp: settings.originCostBp,
      formF: supplier?.facts?.formF?.value ?? 'unknown',
      assumptions,
      freightQuoteUsdMicro: freightMicro,
      params,
      fx,
    })
    for (const r of resolved.filter((x) => !x.priced)) {
      result.lineBlockers[r.id] = ['Moneda sin definir: no se puede costear']
    }
    return result
  }

  const result = costFor(mode, freightQuoteUsdMicro)
  const byLine = new Map(result.lines.map((l) => [l.lineId, l]))

  const rows = resolved.map((r) => {
    const cost = byLine.get(r.id) ?? null
    return {
      ...r,
      cost,
      blockers: result.lineBlockers[r.id] ?? [],
      unitSaleMicro:
        cost && marginBp != null ? withMargin(cost.unitLandedNetMicro, marginBp) : null,
      totalSaleMicro: cost && marginBp != null ? withMargin(cost.landedNetMicro, marginBp) : null,
    }
  })

  const unverified = [...result.unverified]
  if (resolved.some((r) => !r.quote.currencyConfirmed)) {
    unverified.push('Moneda sin confirmar en alguna cotización')
  }
  if (resolved.some((r) => r.quote.inferred)) {
    unverified.push('Incluye cotizaciones inferidas del lado opuesto, no ofertadas')
  }
  if (resolved.some((r) => r.incotermAssumed)) {
    unverified.push('Incoterm supuesto: alguna cotización no lo indica')
  }

  // El flete cotizado corresponde al modo elegido: el otro modo usa la tarifa.
  const comparison = COMPARED_MODES.map((m) => {
    const r = m === mode ? result : costFor(m, null)
    return {
      mode: m,
      result: r,
      saleMicro: saleOf(r, marginBp),
    }
  })

  return {
    rows,
    result,
    unverified,
    comparison,
    unitCount: resolved.reduce((sum, r) => sum + r.qty, 0),
    saleTotalMicro: saleOf(result, marginBp),
  }
}
