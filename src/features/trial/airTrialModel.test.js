import { describe, it, expect } from 'vitest'
import { money } from '@libs/money'
import {
  DEFAULT_FX,
  DEFAULT_PARAM_SET,
  DEFAULT_UNIT_COST_ASSUMPTIONS,
  SHIPMENT_CHARGES,
} from '@mocks/costParams'
import { FOCUS_MARGIN_BP, buildAirTrial, summarizeExcluded, supplierAbbr } from './airTrialModel'

// Datos de prueba (mocks solo en tests): tres proveedores y tres repuestos en USD.
const rates = { ...DEFAULT_UNIT_COST_ASSUMPTIONS, shipmentCharges: SHIPMENT_CHARGES }
const suppliers = [
  { id: 's1', alias: 'Henan Ronglai', facts: {} },
  { id: 's2', alias: 'XM Industrial', facts: {} },
  { id: 's3', alias: 'Anhui Zuoheng', facts: {} },
]
const settingsFor = (id) => ({
  originDistanceKm: id === 's3' ? null : 40,
  originDistanceConfirmed: false,
  originFallback: { bp: 300, averageKm: 40 },
})
const quote = (supplierId, cents, partType = 'original') => ({
  supplierId,
  partType,
  partTypeConfirmed: true,
  inferred: false,
  currency: 'USD',
  price: money(cents, 'USD'),
  incoterm: 'EXW',
})
const part = (id, name, quotes, extra = {}) => ({
  id,
  nameEs: name,
  code: `C-${id}`,
  weightG: 1000,
  volumeCm3: 6000,
  baselinePrice: { amount: 100_000, currency: 'CLP', scale: 0 },
  quantityEstimated: 10,
  logisticsStatus: 'seller_listing',
  packageCm: null,
  quotes,
  ...extra,
})

const run = (parts) =>
  buildAirTrial({ parts, suppliers, settingsFor, rates, params: DEFAULT_PARAM_SET, fx: DEFAULT_FX })
const base = (result, option, caseKey = 'B') => result.scenarios[0].results[option][caseKey]

describe('supplierAbbr', () => {
  it('usa las iniciales, o la sigla que el nombre ya trae', () => {
    expect(supplierAbbr('Henan Ronglai')).toBe('HR')
    expect(supplierAbbr('XM Industrial')).toBe('XM')
  })
})

describe('buildAirTrial', () => {
  it('asigna cada repuesto al proveedor de menor costo y cobra los gastos por embarque una vez por proveedor', () => {
    const parts = [
      part('p1', 'Óptico DEL DER', [quote('s1', 3000), quote('s2', 2000)]),
      part('p2', 'Bandeja DEL DER', [quote('s1', 3000), quote('s2', 2500)]),
    ]
    const r = run(parts)
    const solo = base(r, 'original').single.find((x) => x.supplierIds[0] === 's2')
    expect(solo.covered).toBe(2)
    const variable = solo.items.reduce((s, i) => s + i.unitCostClp * i.qty, 0)
    // Despacho, guía aérea y reparto: US$ 495 por proveedor, una sola vez, no por repuesto.
    const fixed = solo.costClp - variable
    expect(fixed).toBeGreaterThanOrEqual(470_000)
    expect(fixed).toBeLessThan(2 * 470_000)
    // s2 es más barato en ambos repuestos: el mejor solo es s2.
    expect(base(r, 'original').single[0].supplierIds).toEqual(['s2'])
  })

  it('el detalle del cálculo suma exacto: por repuesto y por pedido', () => {
    const r = run([
      part('p1', 'Óptico DEL DER', [quote('s1', 3000), quote('s2', 2000)]),
      part('p2', 'Bandeja DEL DER', [quote('s1', 3000), quote('s2', 2500)]),
    ])
    const best = base(r, 'original').single[0]
    for (const i of best.items) {
      const total = i.breakdown.reduce((sum, l) => sum + l.cents, 0)
      expect(total).toBe(Math.round(i.unitCostUsdMicro / 10_000))
    }
    // Unidades, compra al proveedor y flete del pedido, para comparar con otros cálculos.
    expect(best.units).toBe(best.items.reduce((sum, i) => sum + i.qty, 0))
    expect(best.fobUsdMicro).toBeGreaterThan(0)
    expect(best.freightUsdMicro).toBeGreaterThan(0)
    expect(best.volumeCm3).toBe(best.units * 6000)
    const calc = best.calc[0]
    expect(calc.lines.reduce((sum, l) => sum + l.cents, 0)).toBe(
      Math.round(calc.totalUsdMicro / 10_000),
    )
  })

  it('saca de la recomendación un precio atípico y lo informa como anomalía', () => {
    const parts = [
      part('p1', 'Caja Reductora', [quote('s1', 100_000), quote('s2', 4100), quote('s3', 110_000)]),
    ]
    const r = run(parts)
    expect(r.anomalies.some((a) => a.code === 'price_low' && a.supplierId === 's2')).toBe(true)
    expect(r.suspectOfferCount).toBe(1)
    const single = base(r, 'original', 'A').single
    expect(single.find((x) => x.supplierIds[0] === 's2')).toBeUndefined()
  })

  it('con dos líneas del mismo proveedor y calidad usa la de menor precio', () => {
    const both = run([part('p1', 'Bandeja', [quote('s1', 5000), quote('s1', 2000)])])
    const cheap = run([part('p1', 'Bandeja', [quote('s1', 2000)])])
    expect(base(both, 'original').single[0].costClp).toBe(base(cheap, 'original').single[0].costClp)
  })

  it('en Más barato toma la calidad más barata de cada repuesto', () => {
    const parts = [
      part('p1', 'Óptico', [quote('s1', 5000, 'original'), quote('s1', 2000, 'alternative')]),
    ]
    const r = run(parts)
    const item = base(r, 'cheapest', 'A').single[0].items
    // El detalle por repuesto solo se guarda para el caso B de la base: se mira en él.
    const b = base(r, 'cheapest', 'B').single[0]
    expect(b.items[0].quality).toBe('AFM')
    expect(item).toBeUndefined()
  })

  it('deja fuera del pedido, con su motivo, lo que cuesta más que el cliente o no cabe en avión', () => {
    const parts = [
      part('p1', 'Puerta DEL DER', [quote('s1', 3000)], { weightG: 30_000, volumeCm3: 600_000 }),
      part('p2', 'Zócalo', [quote('s1', 3000)], { packageCm: [200, 20, 15] }),
      part('p3', 'Bandeja', [quote('s1', 3000)]),
    ]
    const r = run(parts)
    const reasons = Object.fromEntries(r.logistics.map((l) => [l.name, l.reasons.join(' | ')]))
    expect(reasons['Puerta DEL DER']).toMatch(/Cuesta más/)
    expect(reasons['Zócalo']).toMatch(/200 × 20 × 15 cm/)
    expect(reasons.Bandeja).toBeUndefined()
    // Ninguna de las dos entra en el pedido de "solo lo que conviene volar".
    const inB = base(r, 'original').single[0].items.map((i) => i.name)
    expect(inB).toEqual(['Bandeja'])
  })

  it('no trata como anomalía lo que solo es un dato que falta', () => {
    const r = run([part('p1', 'Bandeja', [quote('s1', 3000)])])
    expect(r.missingData.some((m) => /s3|AZ/.test(m.titleEs) && /aeropuerto/.test(m.titleEs))).toBe(
      true,
    )
    expect(
      r.anomalies.every((a) => !/Formulario|aeropuerto|Used|sin código/i.test(a.titleEs)),
    ).toBe(true)
  })

  it('el ahorro con margen sale del costo en Chile, no del precio al cliente', () => {
    const r = run([part('p1', 'Bandeja', [quote('s1', 3000)])])
    const x = base(r, 'original').single[0]
    const expected = x.baselineClp - Math.round((x.costClp * (10_000 + FOCUS_MARGIN_BP)) / 10_000)
    expect(x.savingsClp[FOCUS_MARGIN_BP]).toBe(expected)
  })

  it('entrega el mejor costo por repuesto y calidad con su proveedor, sin ofertas atípicas', () => {
    const r = run([
      part('p1', 'Caja Reductora', [quote('s1', 100_000), quote('s2', 4100), quote('s3', 110_000)]),
      part('p2', 'Bandeja', [quote('s1', 3000), quote('s2', 2000)]),
    ])
    expect(r.partCosts.p2.original.supplierId).toBe('s2')
    // s2 tiene un precio atípico en p1: el mejor costo válido es de s1.
    expect(r.partCosts.p1.original.supplierId).toBe('s1')
    expect(r.partCosts.p2.alternative).toBeUndefined()
  })
})

describe('summarizeExcluded', () => {
  const logistics = [
    {
      partId: 'a',
      name: 'Tapabarro',
      reasons: ['Cuesta más que lo que paga hoy el cliente'],
      kg: 71.5,
      costClp: 300_000,
      baselineClp: 200_000,
      demandClp: 2_000_000, // 10 unidades
    },
    {
      partId: 'b',
      name: 'Capó',
      reasons: ['Bulto de 200 × 12 × 25 cm: puede exigir avión de carga'],
      kg: 40,
      costClp: 100_000,
      baselineClp: 200_000,
      demandClp: 4_000_000,
    },
    {
      partId: 'c',
      name: 'Compresor',
      reasons: ['Posible mercancía peligrosa'],
      kg: null,
      costClp: null,
      baselineClp: null,
      demandClp: 0,
    },
  ]
  const s = summarizeExcluded(logistics)

  it('calcula cuánto más caro sale cada repuesto y el sobrecosto total', () => {
    const a = s.rows.find((r) => r.partId === 'a')
    expect(a).toMatchObject({ qty: 10, diffClp: 100_000, diffBp: 5000, extraClp: 1_000_000 })
    expect(s.price).toEqual({ count: 1, extraClp: 1_000_000, medianBp: 5000 })
  })

  it('un repuesto que sale más barato no suma sobrecosto', () => {
    const b = s.rows.find((r) => r.partId === 'b')
    expect(b).toMatchObject({ diffClp: -100_000, diffBp: -5000, extraClp: 0 })
    expect(s.size).toEqual({ count: 1, kg: 40 })
  })

  it('sin costo o sin precio de referencia no calcula diferencia', () => {
    const c = s.rows.find((r) => r.partId === 'c')
    expect(c).toMatchObject({ diffClp: null, diffBp: null, extraClp: 0 })
    expect(s.dg.count).toBe(1)
  })

  it('ordena por sobrecosto y luego por demanda', () => {
    expect(s.rows.map((r) => r.partId)).toEqual(['a', 'b', 'c'])
  })
})
