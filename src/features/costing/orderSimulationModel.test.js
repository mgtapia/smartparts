import { describe, it, expect } from 'vitest'
import { money } from '@libs/money'
import { computeUnitCost } from '@core/costing/unitCost'
import {
  DEFAULT_PARAM_SET,
  DEFAULT_FX,
  DEFAULT_UNIT_COST_ASSUMPTIONS,
  SHIPMENT_CHARGES,
} from '@mocks/costParams'
import {
  buildPlanInputs,
  cheapestScenario,
  defaultQuantity,
  QUALITY,
  QUANTITY_SOURCE,
  simulateOrder,
  simulateStrategies,
  vehicleQuantityRows,
} from './orderSimulationModel'

// Datos de prueba (mocks solo en tests): dos repuestos de un vehículo con un proveedor.
const part = (id, quantityEstimated, vehicleId = 'v1') => ({
  id,
  vehicleId,
  nameEs: id,
  weightG: 2000,
  volumeCm3: 8000,
  quantityEstimated,
  baselinePrice: null,
})
const quote = (id, partId, tiers = []) => ({
  id,
  partId,
  supplierId: 's1',
  supplier: { id: 's1', facts: {} },
  partType: 'original',
  currency: 'USD',
  price: { amount: 1000, currency: 'USD', scale: 2 },
  priceTiers: tiers,
  incoterm: 'EXW',
  inferred: false,
})

const pA = part('a', 12)
const pB = part('b', 5)
const lines = [
  { part: pA, quote: quote('qa', 'a', [{ minQty: 10, amountMinor: 800 }]) },
  { part: pB, quote: quote('qb', 'b') },
  { part: part('z', 7, 'v2'), quote: quote('qz', 'z') },
]
const settingsFor = () => ({
  originDistanceKm: 500,
  originFallback: { bp: 300, averageKm: 500 },
  assumedIncoterm: 'none',
})
const base = {
  lines,
  vehicleId: 'v1',
  quality: QUALITY.ANY,
  quantitySource: QUANTITY_SOURCE.CLIENT_ESTIMATE,
  settingsFor,
  fx: DEFAULT_FX,
}
const simulate = (extra) =>
  simulateOrder({
    ...base,
    ...extra,
    mode: 'sea_lcl',
    assumptions: { ...DEFAULT_UNIT_COST_ASSUMPTIONS, shipmentCharges: SHIPMENT_CHARGES },
    params: DEFAULT_PARAM_SET,
  })

describe('cantidades por defecto', () => {
  it('siguen la estimación del cliente o una de cada una', () => {
    expect(defaultQuantity(pA, QUANTITY_SOURCE.CLIENT_ESTIMATE)).toBe(12)
    expect(defaultQuantity(pA, QUANTITY_SOURCE.ONE_EACH)).toBe(1)
  })
})

describe('cantidades editadas', () => {
  it('reemplazan la cantidad por defecto de ese repuesto y no las demás', () => {
    const { parts } = buildPlanInputs({ ...base, quantityOverrides: { a: 40 } })
    expect(Object.fromEntries(parts.map((p) => [p.partId, p.qty]))).toEqual({ a: 40, b: 5 })
  })

  it('cambian el tramo de precio que corresponde a la cantidad', () => {
    const priceOf = (overrides) =>
      buildPlanInputs({ ...base, quantityOverrides: overrides }).offers.find(
        (o) => o.partId === 'a',
      ).unitPrice.amount
    expect(priceOf({ a: 9 })).toBe(1000)
    expect(priceOf({ a: 10 })).toBe(800)
  })

  it('cero saca el repuesto del pedido', () => {
    const { parts, notes } = buildPlanInputs({ ...base, quantityOverrides: { b: 0 } })
    expect(parts.map((p) => p.partId)).toEqual(['a'])
    expect(notes.partsWithoutQty).toBe(1)
  })

  it('cambian el costo del pedido', () => {
    const cost = (overrides) =>
      simulate({ quantityOverrides: overrides }).scenarios.find((s) => s.id === 'best').cost.totals
        .landedNet
    expect(cost({ a: 100 })).toBeGreaterThan(cost({}))
  })

  it('no afectan a la canasta explícita de una OC de cliente', () => {
    const basket = [{ partId: 'a', qty: 3 }]
    const { parts } = buildPlanInputs({ ...base, basket, quantityOverrides: { a: 99 } })
    expect(parts[0].qty).toBe(3)
  })
})

describe('vehicleQuantityRows', () => {
  it('lista los repuestos del vehículo con su cantidad vigente y si fue editada', () => {
    const rows = vehicleQuantityRows({ ...base, quantityOverrides: { a: 40 } })
    expect(rows.map((r) => [r.part.id, r.defaultQty, r.qty, r.edited])).toEqual([
      ['a', 12, 40, true],
      ['b', 5, 5, false],
    ])
  })
})

describe('escenarios por estrategia', () => {
  // Cada repuesto tiene una oferta original cara y una alternativa barata.
  const afm = (id, partId, amount) => ({
    ...quote(id, partId),
    partType: 'alternative',
    price: { amount, currency: 'USD', scale: 2 },
  })
  const strategyLines = [
    { part: pA, quote: quote('qa', 'a') },
    { part: pA, quote: afm('qa2', 'a', 300) },
    { part: pB, quote: quote('qb', 'b') },
    { part: pB, quote: afm('qb2', 'b', 200) },
  ]
  const run = () =>
    simulateStrategies({
      ...base,
      lines: strategyLines,
      assumptions: { ...DEFAULT_UNIT_COST_ASSUMPTIONS, shipmentCharges: SHIPMENT_CHARGES },
      params: DEFAULT_PARAM_SET,
    })
  const landed = (r, id) => r.scenarios.find((s) => s.id === id).cost.totals.landedNet

  it('son cuatro: originales o más económico, por mar o por aire', () => {
    expect(run().scenarios.map((s) => s.id)).toEqual([
      'oem-sea',
      'oem-air',
      'cheapest-sea',
      'cheapest-air',
    ])
  })

  it('originales usa solo ofertas originales y más económico puede usar alternativas', () => {
    const r = run()
    const qualityOf = (id) =>
      new Set(
        r.scenarios
          .find((s) => s.id === id)
          .cost.lines.map((l) => (l.offerId.endsWith('2') ? 'alternative' : 'original')),
      )
    expect(qualityOf('oem-sea')).toEqual(new Set(['original']))
    expect(qualityOf('cheapest-sea')).toEqual(new Set(['alternative']))
  })

  it('lo más económico nunca cuesta más que solo originales con el mismo envío', () => {
    const r = run()
    expect(landed(r, 'cheapest-sea')).toBeLessThanOrEqual(landed(r, 'oem-sea'))
    expect(landed(r, 'cheapest-air')).toBeLessThanOrEqual(landed(r, 'oem-air'))
  })

  it('en marítimo elige el formato más barato y en aéreo, aéreo', () => {
    const r = run()
    expect(['sea_lcl', 'sea_fcl_20', 'sea_fcl_40hq']).toContain(
      r.scenarios.find((s) => s.id === 'oem-sea').mode,
    )
    expect(r.scenarios.find((s) => s.id === 'oem-air').mode).toBe('air')
  })

  it('cheapestScenario propone el más barato entre los que cubren más repuestos', () => {
    const r = run()
    const pick = cheapestScenario(r.scenarios)
    const min = Math.min(...r.scenarios.map((s) => s.cost.totals.landedNet))
    expect(pick.cost.totals.landedNet).toBe(min)
  })

  it('el cálculo rápido de ofertas da el mismo costo final que el completo', () => {
    const args = {
      unitPrice: money(1000, 'USD'),
      incoterm: 'EXW',
      originDistanceKm: 500,
      formF: 'unknown',
      weightG: 2000,
      volumeCm3: 8000,
      logisticsConfirmed: false,
      mode: 'sea_lcl',
      assumptions: { ...DEFAULT_UNIT_COST_ASSUMPTIONS, shipmentCharges: SHIPMENT_CHARGES },
      params: DEFAULT_PARAM_SET,
      fx: DEFAULT_FX,
    }
    const full = computeUnitCost(args)
    const fast = computeUnitCost({ ...args, summaryOnly: true })
    expect(fast.landedNetUsdMicro).toBe(full.landedNetUsdMicro)
    expect(fast.components).toEqual([])
  })
})
