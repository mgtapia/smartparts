import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  DEFAULT_PARAM_SET,
  DEFAULT_FX,
  DEFAULT_UNIT_COST_ASSUMPTIONS,
  SHIPMENT_CHARGES,
} from '@mocks/costParams'
import { costShipment } from '@core/costing/purchasePlan'
import { money } from '@libs/money'
import { buildOrder, unitPriceForQty, withMargin } from './orderModel'

const quote = (extra = {}) => ({
  id: 'q1',
  supplierId: 's1',
  partType: 'original',
  currency: 'USD',
  currencyConfirmed: true,
  price: { amount: 10000, currency: 'USD', scale: 2 },
  priceTiers: [],
  incoterm: 'EXW',
  moq: null,
  ...extra,
})
const part = { id: 'p1', weightG: 4000, volumeCm3: 10000, logisticsStatus: 'estimated' }
const settings = (extra = {}) => ({
  originDistanceKm: 500,
  originDistanceConfirmed: true,
  originFallback: { bp: 300, averageKm: 500 },
  assumedIncoterm: 'none',
  ...extra,
})

const base = {
  part,
  quote: quote(),
  qty: 10,
  supplier: { facts: { formF: { value: 'no' } } },
  mode: 'sea_lcl',
  settings: settings(),
  assumptions: { ...DEFAULT_UNIT_COST_ASSUMPTIONS, shipmentCharges: SHIPMENT_CHARGES },
  marginBp: 2000,
  params: DEFAULT_PARAM_SET,
  fx: DEFAULT_FX,
}

describe('unitPriceForQty', () => {
  const tiered = quote({
    priceTiers: [
      { minQty: 10, amountMinor: 9000 },
      { minQty: 50, amountMinor: 8000 },
    ],
  })
  it('usa el mayor tramo alcanzado', () => {
    expect(unitPriceForQty(tiered, 60).price.amount).toBe(8000)
    expect(unitPriceForQty(tiered, 10).tierMinQty).toBe(10)
  })
  it('bajo el primer tramo usa el precio más alto', () => {
    expect(unitPriceForQty(tiered, 3)).toMatchObject({ tierMinQty: null })
    expect(unitPriceForQty(tiered, 3).price.amount).toBe(10000)
  })
  it('sin moneda no hay precio', () => {
    expect(unitPriceForQty(quote({ currency: null }), 1)).toBeNull()
  })
})

describe('buildOrder', () => {
  it('da el mismo costo que costShipment para el mismo repuesto, cantidad y tramo', () => {
    const tiered = quote({ priceTiers: [{ minQty: 10, amountMinor: 9000 }] })
    const o = buildOrder({ ...base, quote: tiered, qty: 12 })
    const shipment = costShipment({
      assignments: [
        {
          part: { partId: 'p1', qty: 12, weightG: 4000, volumeCm3: 10000 },
          offer: {
            offerId: 'q1',
            partId: 'p1',
            supplierId: 's1',
            partType: 'original',
            unitPrice: money(9000, 'USD'),
            incoterm: 'EXW',
          },
        },
      ],
      suppliers: new Map([
        [
          's1',
          {
            id: 's1',
            originDistanceKm: 500,
            originFallback: { bp: 300, averageKm: 500 },
            formF: 'no',
          },
        ],
      ]),
      mode: base.mode,
      assumptions: base.assumptions,
      params: base.params,
      fx: base.fx,
    })
    expect(o.cost.landedNet).toBe(shipment.totals.landedNet)
    expect(o.cost.unitLandedNet).toBe(shipment.lines[0].unitLandedNet)
    for (const key of ['goods', 'inland', 'export', 'freight', 'insurance', 'duty', 'chile']) {
      expect(o.cost[key]).toBe(shipment.totals[key])
    }
    expect(o.cost.goods).toBe(12 * 90_000_000)
  })

  it('el costo final suma sus componentes y el precio de venta es costo más margen', () => {
    const o = buildOrder(base)
    const c = o.cost
    expect(c.landedNet).toBe(
      c.goods + c.inland + c.export + c.freight + c.insurance + c.duty + c.chile + c.bank,
    )
    expect(o.totalSaleMicro).toBe(withMargin(c.landedNet, 2000))
    expect(o.unitSaleMicro).toBe(withMargin(c.unitLandedNet, 2000))
  })

  it('más cantidad baja el costo unitario: los gastos por embarque se diluyen', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 200 }), fc.integer({ min: 2, max: 10 }), (q, k) => {
        const small = buildOrder({ ...base, qty: q }).cost.unitLandedNet
        const large = buildOrder({ ...base, qty: q * k }).cost.unitLandedNet
        return large < small
      }),
      { numRuns: 40 },
    )
  })

  it('el proveedor más lejos del puerto cuesta más', () => {
    const near = buildOrder({ ...base, qty: 50, settings: settings({ originDistanceKm: 100 }) })
    const far = buildOrder({ ...base, qty: 50, settings: settings({ originDistanceKm: 1500 }) })
    expect(far.cost.inland).toBeGreaterThan(near.cost.inland)
    expect(far.cost.landedNet).toBeGreaterThan(near.cost.landedNet)
  })

  it('sin distancia usa el supuesto conservador y lo marca como no verificado', () => {
    const o = buildOrder({ ...base, settings: settings({ originDistanceKm: null }) })
    const withAverage = buildOrder({ ...base, settings: settings({ originDistanceKm: 500 }) })
    expect(o.cost.inland).toBeGreaterThanOrEqual(withAverage.cost.inland)
    expect(o.reasons.inland.join(' ')).toMatch(/sin distancia/)
  })

  it('un precio FOB no paga transporte en China ni exportación', () => {
    const o = buildOrder({ ...base, quote: quote({ incoterm: 'FOB' }) })
    expect(o.cost.inland).toBe(0)
    expect(o.cost.export).toBe(0)
  })

  it('sin margen no hay precio de venta', () => {
    const o = buildOrder({ ...base, marginBp: null })
    expect(o.totalSaleMicro).toBeNull()
    expect(o.cost).not.toBeNull()
  })

  it('compara marítimo y aéreo con los mismos supuestos', () => {
    const o = buildOrder(base)
    const sea = o.comparison.find((c) => c.mode === 'sea_lcl')
    const air = o.comparison.find((c) => c.mode === 'air')
    expect(sea.cost).toEqual(o.cost)
    expect(air.cost.freight).not.toBe(sea.cost.freight)
    expect(air.totalSaleMicro).toBe(withMargin(air.cost.landedNet, 2000))
  })

  it('una cotización sin moneda no se costea y dice por qué', () => {
    const o = buildOrder({ ...base, quote: quote({ currency: null }) })
    expect(o.cost).toBeNull()
    expect(o.blockers[0]).toMatch(/Moneda sin definir/)
  })

  it('sin Incoterm no se costea, salvo que se suponga uno', () => {
    expect(buildOrder({ ...base, quote: quote({ incoterm: null }) }).blockers[0]).toMatch(
      /Sin Incoterm/,
    )
    const assumed = buildOrder({
      ...base,
      quote: quote({ incoterm: null }),
      settings: settings({ assumedIncoterm: 'EXW' }),
    })
    expect(assumed.cost).not.toBeNull()
    expect(assumed.reasons.inland).toContain('Incoterm supuesto: la cotización no lo indica')
  })

  it('una batería que no puede volar bloquea el aéreo, no da un número', () => {
    const dgProfile = {
      unNumber: 'UN3480',
      un383: { status: 'provided' },
      airTransport: { allowed: false },
      seaTransport: { allowed: true },
    }
    const o = buildOrder({ ...base, mode: 'air', part: { ...part, dgProfile } })
    expect(o.cost).toBeNull()
    expect(o.blockers[0]).toMatch(/UN3480/)
  })

  it('sin tarifa de flete no se calcula', () => {
    const o = buildOrder({
      ...base,
      assumptions: { ...base.assumptions, seaUsdPerRtCents: null },
    })
    expect(o.cost).toBeNull()
    expect(o.blockers[0]).toMatch(/tarifa de flete/)
  })

  it('marca como no verificadas la moneda sin confirmar y las cotizaciones inferidas', () => {
    const o = buildOrder({ ...base, quote: quote({ currencyConfirmed: false, inferred: true }) })
    expect(o.reasons.goods).toContain('Moneda sin confirmar')
    expect(o.reasons.goods).toContain('Cotización inferida del lado opuesto, no ofertada')
    expect(buildOrder(base).reasons.goods).toEqual([])
  })

  it('avisa cuando la cantidad no alcanza el mínimo del proveedor', () => {
    const o = buildOrder({ ...base, quote: quote({ moq: 20 }), qty: 5 })
    expect(o.moqShort).toBe(true)
  })
})
