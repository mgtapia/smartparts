// Modelo de la pestaña "Por repuesto" de la Calculadora: función pura. Cada columna es una OC
// de un solo repuesto a un proveedor con una cantidad. Aplica el tramo de precio que
// corresponde a la cantidad y la costea con `costShipment`, el mismo modelo de la matriz de
// cotizaciones y del simulador de pedido completo: transporte en China por distancia y
// toneladas del proveedor, exportación, flete sobre el total cobrable, seguro, arancel, gastos
// en Chile y agente una vez por embarque, y transferencia bancaria. Suma el precio de venta con
// el margen. Sin React ni Firebase.
import { costShipment } from '@core/costing/purchasePlan'
import { checkDgBlockers } from '@core/costing/dgBlocker'
import { CONFIRMED_LOGISTICS_STATUSES, SHIPPING_MODES } from '@constants/enums'
import { money, roundHalfUp } from '@libs/money'

const BP = 10000
const EXW = 'EXW'
const COSTABLE_INCOTERMS = ['EXW', 'FOB', 'FCA']

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

/**
 * @typedef {Object} PartOrderCost   Totales de la OC, en micros de USD.
 * @property {number} goods      Precio del proveedor × cantidad.
 * @property {number} inland     Transporte en China (solo EXW).
 * @property {number} export     Gastos de exportación (solo EXW).
 * @property {number} freight
 * @property {number} insurance
 * @property {number} duty
 * @property {number} chile      Gastos en Chile y agente de aduanas.
 * @property {number} bank       Transferencia bancaria al proveedor.
 * @property {number} landedNet  Costo final sin IVA.
 * @property {number} unitLandedNet
 * @property {number} vat        IVA de importación, recuperable.
 */

/**
 * Costo de una OC de un solo repuesto en un modo de envío. Bloquea (no calcula) si falta la
 * moneda, el Incoterm no se sabe llevar a FOB, la mercancía peligrosa no puede ir en el modo o
 * falta la tarifa de flete.
 * @returns {{ blockers: string[], cost: PartOrderCost|null }}
 */
function costFor({ mode, part, supplierId, supplier, priced, incoterm, settings, rest }) {
  if (!priced) return { blockers: ['Moneda sin definir: no se puede costear'], cost: null }
  if (!COSTABLE_INCOTERMS.includes(incoterm)) {
    return {
      blockers: [
        incoterm
          ? `Incoterm ${incoterm}: todavía no sabemos llevarlo a FOB`
          : 'Sin Incoterm: no se puede costear',
      ],
      cost: null,
    }
  }
  const dg = checkDgBlockers(mode, part.dgProfile ?? undefined)
  if (dg.blockers.length > 0) return { blockers: dg.blockers, cost: null }

  const shipment = costShipment({
    assignments: [
      {
        part: {
          partId: part.id ?? 'part',
          qty: rest.qty,
          weightG: part.weightG,
          volumeCm3: part.volumeCm3,
        },
        offer: {
          offerId: rest.quoteId ?? 'quote',
          partId: part.id ?? 'part',
          supplierId,
          partType: rest.partType,
          unitPrice: priced.price,
          incoterm,
        },
      },
    ],
    suppliers: new Map([
      [
        supplierId,
        {
          id: supplierId,
          originDistanceKm: settings.originDistanceKm ?? null,
          originFallback: settings.originFallback,
          formF: supplier?.facts?.formF?.value ?? 'unknown',
        },
      ],
    ]),
    mode,
    assumptions: rest.assumptions,
    params: rest.params,
    fx: rest.fx,
  })
  if (shipment.blockers.length > 0) return { blockers: shipment.blockers, cost: null }
  const { totals, lines } = shipment
  return {
    blockers: [],
    cost: {
      goods: totals.goods,
      inland: totals.inland,
      export: totals.export,
      freight: totals.freight,
      insurance: totals.insurance,
      duty: totals.duty,
      chile: totals.chile,
      bank: totals.bank,
      landedNet: totals.landedNet,
      unitLandedNet: lines[0].unitLandedNet,
      vat: totals.vat,
    },
  }
}

/**
 * Por qué no está verificado cada componente (mismas claves que `PartOrderCost`). Todo lo que
 * sale de una referencia pública o de un supuesto del equipo lleva su motivo; la UI lo muestra
 * en rojo.
 * @returns {Record<string, string[]>}
 */
function reasonsFor({ quote, part, supplier, settings, incoterm, incotermAssumed, params }) {
  const logistics = CONFIRMED_LOGISTICS_STATUSES.includes(part.logisticsStatus)
    ? []
    : ['Peso y volumen sin confirmar']
  const paramsVerified = params.verificationStatus?.verifiedAgainstOfficial === true
  const fiscal = paramsVerified ? [] : ['Parámetros fiscales sin verificar contra Aduana y SII']
  const assumedIncoterm = incotermAssumed ? ['Incoterm supuesto: la cotización no lo indica'] : []
  const isExw = incoterm === EXW
  const fallbackPct = ((settings.originFallback?.bp ?? 0) / 100).toLocaleString('es-CL')
  const distance =
    settings.originDistanceKm == null
      ? [
          `Proveedor sin distancia al puerto o aeropuerto: se usa el mayor entre el ${fallbackPct} % del precio y el transporte con la distancia promedio`,
        ]
      : settings.originDistanceConfirmed
        ? []
        : ['Distancia del proveedor estimada, sin fuente']
  const reference = 'Tarifa de referencia pública, sin cotización real'
  const formF = supplier?.facts?.formF?.value ?? 'unknown'

  const price = []
  if (!quote.currencyConfirmed) price.push('Moneda sin confirmar')
  if (quote.inferred) price.push('Cotización inferida del lado opuesto, no ofertada')
  if (quote.currency && quote.currency !== 'USD') {
    price.push('Llevado a USD con el tipo de cambio de referencia')
  }

  return {
    goods: price,
    inland: isExw ? [reference, ...distance, ...logistics, ...assumedIncoterm] : assumedIncoterm,
    export: isExw ? [reference, ...assumedIncoterm] : assumedIncoterm,
    freight: ['Tarifa de flete de referencia, sin cotización de forwarder', ...logistics],
    insurance: ['Tasa de seguro referencial', ...logistics],
    duty: [
      ...fiscal,
      formF === 'yes'
        ? 'Tasa TLC supuesta: depende de la partida arancelaria'
        : formF === 'unknown'
          ? 'Proveedor sin confirmar si emite Formulario F'
          : null,
    ].filter(Boolean),
    chile: [
      'Gastos en Chile y agente de aduanas con tarifas de referencia, sin cotización real',
      ...logistics,
    ],
    bank: ['Tarifa publicada del banco, sin confirmar con el banco que se use'],
    vat: fiscal,
  }
}

/**
 * OC de un solo repuesto a un proveedor, con una cantidad.
 * @param {Object} input
 * @param {any} input.part       Repuesto (peso y volumen por unidad, estado logístico, perfil DG).
 * @param {any} input.quote      Cotización (tramos de precio, moneda, Incoterm, MOQ).
 * @param {number} input.qty
 * @param {any} input.supplier
 * @param {string} input.mode
 * @param {{ originDistanceKm: number|null, originDistanceConfirmed?: boolean, originFallback?: { bp: number, averageKm: number|null }, assumedIncoterm: string }} input.settings
 *   Supuestos del proveedor (`settingsFor` de useCostAssumptions).
 * @param {import('@core/costing/unitCost').UnitCostAssumptions} input.assumptions  Tarifas, gastos por etapa y aranceles vigentes.
 * @param {number|null} input.marginBp
 * @param {any} input.params
 * @param {any} input.fx
 */
export function buildOrder({
  part,
  quote,
  qty,
  supplier,
  mode,
  settings,
  assumptions,
  marginBp,
  params,
  fx,
}) {
  const priced = unitPriceForQty(quote, qty)
  const incotermAssumed = !quote.incoterm && settings.assumedIncoterm !== 'none'
  const incoterm = quote.incoterm ?? (incotermAssumed ? settings.assumedIncoterm : null)
  const context = {
    part,
    supplierId: quote.supplierId ?? 'supplier',
    supplier,
    priced,
    incoterm,
    settings,
    rest: { qty, quoteId: quote.id, partType: quote.partType, assumptions, params, fx },
  }
  const sale = (micro) => (micro != null && marginBp != null ? withMargin(micro, marginBp) : null)

  const { blockers, cost } = costFor({ ...context, mode })
  const reasons = reasonsFor({ quote, part, supplier, settings, incoterm, incotermAssumed, params })

  // Marítimo y aéreo lado a lado, con los mismos supuestos.
  const comparison = COMPARED_MODES.map((m) => {
    const r = m === mode ? { blockers, cost } : costFor({ ...context, mode: m })
    return { mode: m, ...r, totalSaleMicro: sale(r.cost?.landedNet) }
  })

  return {
    qty,
    priced,
    incoterm,
    incotermAssumed,
    moqShort: quote.moq != null && qty < quote.moq,
    blockers,
    cost,
    reasons,
    unitSaleMicro: sale(cost?.unitLandedNet),
    totalSaleMicro: sale(cost?.landedNet),
    comparison,
  }
}
