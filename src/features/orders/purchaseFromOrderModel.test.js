import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PARAM_SET,
  DEFAULT_FX,
  DEFAULT_UNIT_COST_ASSUMPTIONS,
  SHIPMENT_CHARGES,
} from '@mocks/costParams'
import { money } from '@libs/money'
import { buildPlanInputs, QUALITY, simulateOrder } from '@features/costing/orderSimulationModel'
import { validateLinks, remainingByClientLine } from './ordersModel'
import {
  basketFromClientOrder,
  buildPurchaseOrders,
  scenarioMargin,
} from './purchaseFromOrderModel'

// Datos de prueba (mocks solo en tests): dos repuestos de un vehículo, cotizados por dos
// proveedores, y una OC del cliente inicial en CLP.
const settingsFor = () => ({
  originDistanceKm: 500,
  originDistanceConfirmed: true,
  originFallback: { bp: 300, averageKm: 500 },
  assumedIncoterm: 'none',
})
const assumptions = { ...DEFAULT_UNIT_COST_ASSUMPTIONS, shipmentCharges: SHIPMENT_CHARGES }

const part = (id, qtyEstimated) => ({
  id,
  vehicleId: 'v1',
  nameEs: id,
  weightG: 2000,
  volumeCm3: 8000,
  quantityEstimated: qtyEstimated,
  baselinePrice: null,
})
const quote = (id, partId, supplierId, amount, tiers = []) => ({
  id,
  quotationId: `qn-${supplierId}`,
  partId,
  supplierId,
  supplier: { id: supplierId, facts: {} },
  partType: 'original',
  currency: 'USD',
  price: { amount, currency: 'USD', scale: 2 },
  priceTiers: tiers,
  incoterm: 'EXW',
  incotermPlace: 'Guangzhou',
  inferred: false,
})

const p1 = part('p1', 12)
const p2 = part('p2', 5)
const lines = [
  {
    part: p1,
    quote: quote('q1a', 'p1', 's1', 1000, [
      { minQty: 10, amountMinor: 800 },
      { minQty: 50, amountMinor: 600 },
    ]),
  },
  { part: p1, quote: quote('q1b', 'p1', 's2', 950) },
  { part: p2, quote: quote('q2a', 'p2', 's1', 3000) },
  { part: p2, quote: quote('q2b', 'p2', 's2', 2500) },
]
const quotes = new Map(lines.map((l) => [l.quote.id, l.quote]))

const order = {
  id: 'co1',
  currency: 'CLP',
  lines: [
    { id: 'cl1', partId: 'p1', qty: 8, unitPrice: money(20_000, 'CLP'), fulfillment: 'purchase' },
    { id: 'cl2', partId: 'p1', qty: 4, unitPrice: money(22_000, 'CLP'), fulfillment: 'purchase' },
    { id: 'cl3', partId: 'p2', qty: 5, unitPrice: money(60_000, 'CLP'), fulfillment: 'purchase' },
    { id: 'cl4', partId: 'p9', qty: 3, unitPrice: null, fulfillment: 'stock' },
  ],
}
const purchase = (id, status, links) => ({
  id,
  supplierId: 's1',
  status,
  currency: 'USD',
  lines: [
    {
      id: `${id}-l`,
      partId: 'p2',
      qty: links.reduce((s, l) => s + l.qty, 0),
      unitPrice: money(3000, 'USD'),
      quoteLineId: null,
      clientOrderLinks: links.map((l) => ({ clientOrderId: 'co1', ...l })),
    },
  ],
})

const common = {
  settingsFor,
  mode: 'sea_lcl',
  assumptions,
  params: DEFAULT_PARAM_SET,
  fx: DEFAULT_FX,
}

describe('basketFromClientOrder', () => {
  it('suma por repuesto las líneas de compra y excluye las de stock', () => {
    const { entries, basket, stockLines } = basketFromClientOrder(order, [], DEFAULT_FX)
    expect(basket).toEqual([
      { partId: 'p1', qty: 12, baselineUsdMicro: null },
      { partId: 'p2', qty: 5, baselineUsdMicro: null },
    ])
    expect(entries[0].sources.map((s) => [s.lineId, s.qty])).toEqual([
      ['cl1', 8],
      ['cl2', 4],
    ])
    expect(stockLines.map((l) => l.id)).toEqual(['cl4'])
  })

  it('descuenta lo ya cubierto por compras vigentes y no cuenta las anuladas', () => {
    const pos = [
      purchase('po1', 'confirmed', [{ lineId: 'cl3', qty: 3 }]),
      purchase('po2', 'cancelled', [{ lineId: 'cl3', qty: 2 }]),
    ]
    const { entries, coveredLines } = basketFromClientOrder(order, pos, DEFAULT_FX)
    expect(entries.find((e) => e.partId === 'p2').qty).toBe(2)
    expect(coveredLines.map((c) => [c.line.id, c.coveredQty])).toEqual([['cl3', 3]])
  })

  it('una línea totalmente cubierta sale de la canasta', () => {
    const pos = [purchase('po1', 'sent', [{ lineId: 'cl3', qty: 5 }])]
    const { basket } = basketFromClientOrder(order, pos, DEFAULT_FX)
    expect(basket.map((b) => b.partId)).toEqual(['p1'])
  })

  it('lleva el precio de venta a micros de USD y deja null si falta', () => {
    const { entries } = basketFromClientOrder(order, [], DEFAULT_FX)
    // 20.000 CLP a 950 CLP por USD, redondeado a centavos de USD.
    expect(entries[0].sources[0].unitUsdMicro).toBe(21_050_000)
    const noPrice = { ...order, lines: [{ ...order.lines[0], unitPrice: null }] }
    expect(basketFromClientOrder(noPrice, [], DEFAULT_FX).entries[0].sources[0].unitUsdMicro).toBe(
      null,
    )
  })
})

describe('canasta explícita en el simulador', () => {
  it('la cantidad decide el tramo de precio', () => {
    const at = (qty) =>
      buildPlanInputs({
        lines,
        basket: [{ partId: 'p1', qty }],
        quality: QUALITY.ANY,
        settingsFor,
        fx: DEFAULT_FX,
      }).offers.find((o) => o.offerId === 'q1a').unitPrice.amount
    expect(at(5)).toBe(1000) // bajo el primer tramo: el precio más alto
    expect(at(10)).toBe(800)
    expect(at(60)).toBe(600)
  })

  it('da el mismo resultado que la canasta por vehículo para las mismas cantidades', () => {
    const byVehicle = simulateOrder({
      ...common,
      lines,
      vehicleId: 'v1',
      quality: QUALITY.ANY,
      quantitySource: 'client_estimate',
    })
    const byBasket = simulateOrder({
      ...common,
      lines,
      basket: [
        { partId: 'p1', qty: 12 },
        { partId: 'p2', qty: 5 },
      ],
      quality: QUALITY.ANY,
    })
    expect(byBasket.scenarios).toEqual(byVehicle.scenarios)
    expect(byBasket.units).toBe(byVehicle.units)
  })

  it('avisa los repuestos de la canasta sin cotización', () => {
    const r = simulateOrder({
      ...common,
      lines,
      basket: [
        { partId: 'p1', qty: 2 },
        { partId: 'nope', qty: 1 },
      ],
      quality: QUALITY.ANY,
    })
    expect(r.notes.partsWithoutQuote).toEqual(['nope'])
  })
})

describe('scenarioMargin y buildPurchaseOrders', () => {
  const { entries, basket } = basketFromClientOrder(order, [], DEFAULT_FX)
  const sim = simulateOrder({ ...common, lines, basket, quality: QUALITY.ANY })
  const scenario = sim.scenarios[0]

  it('la venta suma línea por línea y el costo es el de lo que se compra', () => {
    const { saleMicro, costMicro, margin } = scenarioMargin(scenario, entries)
    expect(saleMicro).toBe(
      8 * 21_050_000 + 4 * 23_160_000 + 5 * 63_160_000, // cl1 + cl2 + cl3
    )
    expect(costMicro).toBe(scenario.cost.totals.landedNet)
    expect(margin.marginMicros).toBe(saleMicro - costMicro)
  })

  it('un repuesto con línea sin precio queda fuera de venta y costo', () => {
    const noPrice = {
      ...order,
      lines: order.lines.map((l) => (l.id === 'cl3' ? { ...l, unitPrice: null } : l)),
    }
    const { entries: e2 } = basketFromClientOrder(noPrice, [], DEFAULT_FX)
    const r = scenarioMargin(scenario, e2)
    expect(r.unpricedPartIds).toEqual(['p2'])
    const p2 = scenario.cost.lines.find((l) => l.partId === 'p2')
    expect(r.costMicro).toBe(scenario.cost.totals.landedNet - p2.landedNet)
  })

  it('crea una OC por proveedor con Σ cantidades = lo asignado y links válidos', () => {
    const { error, orders } = buildPurchaseOrders({
      scenario,
      entries,
      quotes,
      order,
      purchaseOrders: [],
    })
    expect(error).toBeNull()
    expect(new Set(orders.map((o) => o.supplierId)).size).toBe(orders.length)
    const remaining = remainingByClientLine(order, [])
    for (const po of orders) {
      expect(po.status).toBe('draft')
      expect(po.incoterm).toBe('EXW')
      expect(po.incotermPlace).toBe('Guangzhou')
      expect(po.quotationId).toBe(`qn-${po.supplierId}`)
      for (const line of po.lines) {
        const offer = scenario.cost.lines.find((l) => l.offerId === line.quoteLineId)
        expect(offer.supplierId).toBe(po.supplierId)
        const linked = line.clientOrderLinks.reduce((s, l) => s + l.qty, 0)
        expect(linked).toBe(line.qty)
        expect(line.qty).toBe(offer.qty)
        expect(validateLinks(line.qty, line.clientOrderLinks, remaining)).toBeNull()
        expect(line.unitPrice.currency).toBe('USD')
      }
    }
    // Todo lo cubierto por el escenario queda asignado a líneas del cliente.
    const total = orders.flatMap((o) => o.lines).reduce((s, l) => s + l.qty, 0)
    expect(total).toBe(scenario.cost.lines.reduce((s, l) => s + l.qty, 0))
  })

  it('reparte un repuesto entre las líneas del cliente en orden', () => {
    const { orders } = buildPurchaseOrders({ scenario, entries, quotes, order, purchaseOrders: [] })
    const p1Line = orders.flatMap((o) => o.lines).find((l) => l.partId === 'p1')
    expect(p1Line.clientOrderLinks.map((l) => [l.lineId, l.qty])).toEqual([
      ['cl1', 8],
      ['cl2', 4],
    ])
  })

  it('no crea nada si se cubriría más de lo pendiente', () => {
    // Las entradas quedaron viejas: otra compra ya cubrió todo cl3 después de simular.
    const pos = [purchase('po1', 'confirmed', [{ lineId: 'cl3', qty: 5 }])]
    const result = buildPurchaseOrders({
      scenario,
      entries,
      quotes,
      order,
      purchaseOrders: pos,
    })
    expect(result.error).toBe('Se enlaza más de lo que falta cubrir del pedido')
    expect(result.orders).toEqual([])
  })

  it('no crea nada si una oferta no tiene moneda o falta su cotización', () => {
    const noCurrency = new Map(quotes)
    for (const [id, q] of quotes) noCurrency.set(id, { ...q, currency: null })
    expect(
      buildPurchaseOrders({ scenario, entries, quotes: noCurrency, order, purchaseOrders: [] })
        .orders,
    ).toEqual([])
    expect(
      buildPurchaseOrders({ scenario, entries, quotes: new Map(), order, purchaseOrders: [] })
        .error,
    ).toMatch(/cotización/)
  })
})
