import { describe, it, expect } from 'vitest'
import { buildAnalytics, QUALITY } from './analyticsModel'

const VEHICLE = 'dongfeng_e70'
const part = (id) => ({ id, vehicleId: VEHICLE, categoryPath: 'x', categoryLabel: 'Puertas' })
// Precio en centavos USD: 1000 = USD 10,00.
const line = (p, supplierId, cents, extra = {}) => ({
  part: p,
  quote: {
    supplierId,
    partType: 'alternative',
    currency: 'USD',
    price: { amount: cents, currency: 'USD', scale: 2 },
    priceTiers: [],
    currencyConfirmed: true,
    ...extra,
  },
})

const p1 = part('p1')
const p2 = part('p2')
const p3 = part('p3')
const parts = [p1, p2, p3, { ...part('otro'), vehicleId: 'kia_niro_ev' }]
const build = (lines, quality = QUALITY.ANY) =>
  buildAnalytics({ vehicleId: VEHICLE, parts, lines, quality, supplierName: (id) => id })

describe('buildAnalytics', () => {
  const lines = [
    line(p1, 'a', 1000),
    line(p1, 'b', 1500),
    line(p2, 'a', 2000),
    line(p2, 'b', 1000),
    line(p3, 'a', 500),
  ]

  it('cuenta cobertura y repuestos comparables', () => {
    const { summary } = build(lines)
    expect(summary).toMatchObject({ totalParts: 3, quotedParts: 3, comparableParts: 2 })
  })

  it('cuenta en cuántos comparables es el más barato y su sobrecosto medio', () => {
    const { suppliers } = build(lines)
    const a = suppliers.find((s) => s.id === 'a')
    const b = suppliers.find((s) => s.id === 'b')
    expect([a.cheapest, b.cheapest]).toEqual([1, 1])
    // a: 0 % en p1 y 100 % en p2; b: 50 % en p1 y 0 % en p2.
    expect([a.overBp, b.overBp]).toEqual([5000, 2500])
  })

  it('ignora las cotizaciones inferidas', () => {
    const { summary } = build([...lines, line(p3, 'b', 100, { inferred: true })])
    expect(summary.comparableParts).toBe(2)
  })

  it('filtra por calidad', () => {
    const mixed = [line(p1, 'a', 1000, { partType: 'original' }), line(p1, 'b', 1500)]
    expect(build(mixed, QUALITY.OEM).summary.quotedParts).toBe(1)
    expect(build(mixed, QUALITY.OEM).summary.comparableParts).toBe(0)
  })

  it('mide la diferencia mediana entre AFM y OEM', () => {
    const l = [
      line(p1, 'a', 1000, { partType: 'original' }),
      line(p1, 'a', 800),
      line(p2, 'a', 2000, { partType: 'original' }),
      line(p2, 'a', 1000),
    ]
    expect(build(l).afmVsOem).toEqual({ medianBp: -3500, pairs: 2 })
  })

  it('cuenta precios con moneda sin confirmar', () => {
    const { summary } = build([line(p1, 'a', 1000, { currencyConfirmed: false })])
    expect(summary).toMatchObject({ pricesTotal: 1, pricesUnconfirmedCurrency: 1 })
  })
})
