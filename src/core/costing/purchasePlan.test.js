import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { money } from '../../libs/money'
import {
  DEFAULT_PARAM_SET,
  DEFAULT_FX,
  DEFAULT_UNIT_COST_ASSUMPTIONS,
  SHIPMENT_CHARGES,
} from '../../mocks/costParams'
import { costShipment, planPurchase } from './purchasePlan'

const ASSUMPTIONS = {
  ...DEFAULT_UNIT_COST_ASSUMPTIONS,
  shipmentCharges: SHIPMENT_CHARGES,
}
const common = {
  mode: 'sea_lcl',
  assumptions: ASSUMPTIONS,
  params: DEFAULT_PARAM_SET,
  fx: DEFAULT_FX,
}

const part = (partId, qty = 10) => ({ partId, qty, weightG: 2000, volumeCm3: 8000 })
const supplier = (id, km = 100) => ({
  id,
  originDistanceKm: km,
  originFallback: { bp: 300, averageKm: 500 },
  formF: 'unknown',
})
const offer = (partId, supplierId, cents, partType = 'original') => ({
  offerId: `${supplierId}-${partId}-${partType}`,
  partId,
  supplierId,
  partType,
  unitPrice: money(cents, 'USD'),
  incoterm: 'EXW',
})

describe('costShipment', () => {
  const suppliers = new Map([
    ['A', supplier('A', 100)],
    ['B', supplier('B', 1500)],
  ])
  const assignments = [
    { part: part('p1'), offer: offer('p1', 'A', 1000) },
    { part: part('p2'), offer: offer('p2', 'B', 2000) },
  ]

  it('invariantes de suma: CIF y costo final cuadran con sus componentes', () => {
    const { totals, lines } = costShipment({ assignments, suppliers, ...common })
    expect(totals.cif).toBe(
      totals.goods + totals.inland + totals.export + totals.freight + totals.insurance,
    )
    expect(totals.landedNet).toBe(totals.cif + totals.duty + totals.chile + totals.bank)
    expect(lines.reduce((a, l) => a + l.landedNet, 0)).toBe(totals.landedNet)
  })

  it('cada proveedor paga su transporte en China, su exportación y su transferencia', () => {
    const { bySupplier } = costShipment({ assignments, suppliers, ...common })
    expect(bySupplier).toHaveLength(2)
    for (const s of bySupplier) {
      expect(s.inland).toBeGreaterThan(0)
      expect(s.export).toBeGreaterThan(0)
      expect(s.bank).toBeGreaterThan(0)
    }
    const far = bySupplier.find((s) => s.supplierId === 'B')
    const near = bySupplier.find((s) => s.supplierId === 'A')
    expect(far.inland).toBeGreaterThan(near.inland)
  })

  it('repartir entre dos proveedores cuesta más que comprarle todo a uno al mismo precio', () => {
    const one = costShipment({
      assignments: [
        { part: part('p1'), offer: offer('p1', 'A', 1000) },
        { part: part('p2'), offer: offer('p2', 'A', 1000) },
      ],
      suppliers: new Map([['A', supplier('A', 100)]]),
      ...common,
    })
    const two = costShipment({
      assignments: [
        { part: part('p1'), offer: offer('p1', 'A', 1000) },
        { part: part('p2'), offer: offer('p2', 'C', 1000) },
      ],
      suppliers: new Map([
        ['A', supplier('A', 100)],
        ['C', supplier('C', 100)],
      ]),
      ...common,
    })
    expect(two.totals.landedNet).toBeGreaterThan(one.totals.landedNet)
  })

  it('sin tarifa de flete no calcula: dice qué falta', () => {
    const r = costShipment({
      assignments,
      suppliers,
      ...common,
      assumptions: { ...ASSUMPTIONS, seaUsdPerRtCents: null },
    })
    expect(r.blockers[0]).toContain('tarifa')
  })

  it('invariantes para cualquier canasta', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            qty: fc.integer({ min: 1, max: 200 }),
            cents: fc.integer({ min: 1, max: 500_000 }),
            weightG: fc.integer({ min: 1, max: 50_000 }),
            volumeCm3: fc.integer({ min: 1, max: 500_000 }),
            supplierId: fc.constantFrom('A', 'B'),
          }),
          { minLength: 1, maxLength: 12 },
        ),
        fc.constantFrom('sea_lcl', 'air'),
        (rows, mode) => {
          const r = costShipment({
            assignments: rows.map((x, i) => ({
              part: { partId: `p${i}`, qty: x.qty, weightG: x.weightG, volumeCm3: x.volumeCm3 },
              offer: offer(`p${i}`, x.supplierId, x.cents),
            })),
            suppliers,
            ...common,
            mode,
          })
          const t = r.totals
          return (
            t.cif === t.goods + t.inland + t.export + t.freight + t.insurance &&
            t.landedNet === t.cif + t.duty + t.chile + t.bank &&
            r.lines.reduce((a, l) => a + l.landedNet, 0) === t.landedNet
          )
        },
      ),
      { numRuns: 60 },
    )
  })
})

describe('planPurchase', () => {
  const byId = (scenarios, id) => scenarios.find((s) => s.id === id)

  it('con precios iguales, la mejor combinación es un solo proveedor (menos gastos fijos)', () => {
    const { scenarios } = planPurchase({
      parts: [part('p1'), part('p2')],
      offers: [
        offer('p1', 'A', 1000),
        offer('p2', 'A', 1000),
        offer('p1', 'B', 1000),
        offer('p2', 'B', 1000),
      ],
      suppliers: [supplier('A', 100), supplier('B', 100)],
      ...common,
    })
    expect(byId(scenarios, 'best').supplierIds).toHaveLength(1)
  })

  it('combina dos proveedores cuando el ahorro supera los gastos fijos extra', () => {
    const { scenarios } = planPurchase({
      parts: [part('p1', 100), part('p2', 100)],
      offers: [
        offer('p1', 'A', 1000),
        offer('p2', 'A', 50_000),
        offer('p1', 'B', 50_000),
        offer('p2', 'B', 1000),
      ],
      suppliers: [supplier('A', 100), supplier('B', 100)],
      ...common,
    })
    expect(byId(scenarios, 'best').supplierIds).toEqual(['A', 'B'])
  })

  it('la cobertura manda: gana la combinación que cubre más repuestos aunque cueste más', () => {
    const { scenarios } = planPurchase({
      parts: [part('p1'), part('p2')],
      offers: [offer('p1', 'A', 100), offer('p1', 'B', 5000), offer('p2', 'B', 5000)],
      suppliers: [supplier('A', 100), supplier('B', 100)],
      ...common,
    })
    const best = byId(scenarios, 'best')
    expect(best.missingPartIds).toHaveLength(0)
    expect(byId(scenarios, 'single-A').missingPartIds).toEqual(['p2'])
  })

  it('lista a cada proveedor solo, con lo que no cubre', () => {
    const { scenarios } = planPurchase({
      parts: [part('p1'), part('p2')],
      offers: [offer('p1', 'A', 1000), offer('p2', 'B', 1000)],
      suppliers: [supplier('A'), supplier('B')],
      ...common,
    })
    expect(scenarios.filter((s) => s.kind === 'single').map((s) => s.supplierIds)).toEqual([
      ['A'],
      ['B'],
    ])
  })

  it('suma lo que paga hoy el cliente por los repuestos cubiertos', () => {
    const { scenarios } = planPurchase({
      parts: [{ ...part('p1', 3), baselineUsdMicro: 20_000_000 }],
      offers: [offer('p1', 'A', 1000)],
      suppliers: [supplier('A')],
      ...common,
    })
    expect(byId(scenarios, 'best').baselineMicro).toBe(60_000_000)
  })
})
