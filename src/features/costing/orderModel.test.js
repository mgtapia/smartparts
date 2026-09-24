import { describe, it, expect } from 'vitest'
import { DEFAULT_PARAM_SET, DEFAULT_FX } from '@mocks/costParams'
import { buildOrder, unitPriceForQty, withMargin } from './orderModel'

const quote = (extra = {}) => ({
  currency: 'USD',
  currencyConfirmed: true,
  price: { amount: 10000, currency: 'USD', scale: 2 },
  priceTiers: [],
  incoterm: 'EXW',
  moq: null,
  ...extra,
})
const part = { weightG: 4000, volumeCm3: 10000, logisticsStatus: 'estimated' }

const base = {
  supplier: { facts: { formF: { value: 'no' } } },
  mode: 'sea_lcl',
  settings: { originCostBp: 500, assumedIncoterm: 'none' },
  assumptions: { airUsdPerKgCents: 600, seaUsdPerRtCents: 18000, ftaDutyBp: 0 },
  freightQuoteUsdMicro: null,
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
  const orderLines = [
    { id: 'a', part, quote: quote(), qty: 10 },
    { id: 'b', part, quote: quote({ price: { amount: 2500, currency: 'USD', scale: 2 } }), qty: 4 },
  ]

  it('el precio de venta es el costo más el margen y suma línea a línea', () => {
    const o = buildOrder({ ...base, orderLines })
    const sum = o.rows.reduce((s, r) => s + r.totalSaleMicro, 0)
    expect(o.saleTotalMicro).toBe(sum)
    expect(o.rows[0].totalSaleMicro).toBe(withMargin(o.rows[0].cost.landedNetMicro, 2000))
  })

  it('sin margen no hay precio de venta', () => {
    const o = buildOrder({ ...base, orderLines, marginBp: null })
    expect(o.saleTotalMicro).toBeNull()
    expect(o.rows[0].cost).not.toBeNull()
  })

  it('compara marítimo y aéreo; el flete cotizado solo aplica al modo elegido', () => {
    const o = buildOrder({ ...base, orderLines, freightQuoteUsdMicro: 500_000_000 })
    const sea = o.comparison.find((c) => c.mode === 'sea_lcl')
    const air = o.comparison.find((c) => c.mode === 'air')
    expect(sea.result.totals.freightMicro).toBe(500_000_000)
    expect(air.result.totals.freightMicro).not.toBe(500_000_000)
  })

  it('una cotización sin moneda bloquea su línea y dice por qué', () => {
    const o = buildOrder({
      ...base,
      orderLines: [{ id: 'x', part, quote: quote({ currency: null }), qty: 1 }],
    })
    expect(o.rows[0].blockers[0]).toMatch(/Moneda sin definir/)
  })

  it('marca como sin verificar la moneda sin confirmar y las inferidas', () => {
    const o = buildOrder({
      ...base,
      orderLines: [
        { id: 'x', part, quote: quote({ currencyConfirmed: false, inferred: true }), qty: 1 },
      ],
    })
    expect(o.unverified).toContain('Moneda sin confirmar en alguna cotización')
    expect(o.unverified).toContain('Incluye cotizaciones inferidas del lado opuesto, no ofertadas')
  })

  it('avisa cuando la cantidad no alcanza el mínimo del proveedor', () => {
    const o = buildOrder({
      ...base,
      orderLines: [{ id: 'x', part, quote: quote({ moq: 20 }), qty: 5 }],
    })
    expect(o.rows[0].moqShort).toBe(true)
  })
})
