import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { money } from '@libs/money'
import {
  COVERAGE,
  clientOrderCoverage,
  coverageStatus,
  isClientLineLinked,
  ordersTotal,
  quotePriceForQty,
  remainingByClientLine,
  toCurrencyMicros,
  validateLinks,
} from './ordersModel'

// Datos de prueba (mocks solo en tests): un pedido del cliente inicial en CLP y
// compras a proveedores en USD y CNY.
const FX = { usdClp: 950_000_000, cnyUsd: 139_000 } // 1 USD = 950 CLP; 1 CNY = 0,139 USD

const clientOrder = {
  id: 'co1',
  currency: 'CLP',
  status: 'confirmed',
  lines: [
    { id: 'cl1', partId: 'p1', qty: 10, unitPrice: money(20_000, 'CLP'), fulfillment: 'purchase' },
    { id: 'cl2', partId: 'p2', qty: 4, unitPrice: money(95_000, 'CLP'), fulfillment: 'purchase' },
    { id: 'cl3', partId: 'p3', qty: 2, unitPrice: null, fulfillment: 'purchase' },
  ],
}

const po = (id, status, currency, lines) => ({
  id,
  supplierId: 's1',
  number: id,
  status,
  incoterm: 'EXW',
  currency,
  lines,
})

const purchaseOrders = [
  po('po1', 'confirmed', 'USD', [
    {
      id: 'pl1',
      partId: 'p1',
      qty: 6,
      unitPrice: money(1000, 'USD'), // US$10 = 9.500 CLP
      quoteLineId: null,
      clientOrderLinks: [{ clientOrderId: 'co1', lineId: 'cl1', qty: 6 }],
    },
  ]),
  po('po2', 'sent', 'USD', [
    {
      id: 'pl2',
      partId: 'p2',
      qty: 4,
      unitPrice: money(5000, 'USD'), // US$50 = 47.500 CLP
      quoteLineId: null,
      clientOrderLinks: [{ clientOrderId: 'co1', lineId: 'cl2', qty: 4 }],
    },
  ]),
  // Anulada: no cubre nada.
  po('po3', 'cancelled', 'USD', [
    {
      id: 'pl3',
      partId: 'p1',
      qty: 4,
      unitPrice: money(900, 'USD'),
      quoteLineId: null,
      clientOrderLinks: [{ clientOrderId: 'co1', lineId: 'cl1', qty: 4 }],
    },
  ]),
]

describe('ordersTotal', () => {
  it('suma precio × cantidad y cuenta las líneas sin precio', () => {
    const { total, missingPrice } = ordersTotal(clientOrder.lines, 'CLP')
    expect(total).toEqual(money(10 * 20_000 + 4 * 95_000, 'CLP'))
    expect(missingPrice).toBe(1)
  })

  it('sin líneas el total es cero', () => {
    expect(ordersTotal([], 'USD').total).toEqual(money(0, 'USD'))
  })
})

describe('toCurrencyMicros', () => {
  it('misma moneda: sin conversión', () => {
    expect(toCurrencyMicros(money(1000, 'USD'), 'USD', FX)).toEqual({
      micros: 10_000_000,
      converted: false,
    })
  })

  it('USD → CLP con el tipo de cambio', () => {
    expect(toCurrencyMicros(money(1000, 'USD'), 'CLP', FX)).toEqual({
      micros: 9500 * 1e6,
      converted: true,
    })
  })

  it('CNY → USD', () => {
    expect(toCurrencyMicros(money(10000, 'CNY'), 'USD', FX)).toEqual({
      micros: 13_900_000,
      converted: true,
    })
  })

  it('a CNY no está soportado', () => {
    expect(toCurrencyMicros(money(1000, 'USD'), 'CNY', FX)).toBeNull()
  })
})

describe('clientOrderCoverage', () => {
  const result = clientOrderCoverage(clientOrder, purchaseOrders, FX)

  it('cubre con las compras vigentes e ignora las anuladas', () => {
    const [l1, l2, l3] = result.lines
    expect(l1.coveredQty).toBe(6)
    expect(l1.remainingQty).toBe(4)
    expect(l1.status).toBe(COVERAGE.PARTIAL)
    expect(l2.status).toBe(COVERAGE.FULL)
    expect(l3.status).toBe(COVERAGE.NONE)
    expect(result.orderedQty).toBe(16)
    expect(result.coveredQty).toBe(10)
    expect(result.status).toBe(COVERAGE.PARTIAL)
  })

  it('margen por línea = venta de lo cubierto − precio de compra convertido', () => {
    const [l1, l2] = result.lines
    // 6 × 20.000 − 6 × 9.500 = 63.000 CLP sobre 120.000 → 52,5 %
    expect(l1.margin.saleMicros).toBe(120_000 * 1e6)
    expect(l1.margin.costMicros).toBe(57_000 * 1e6)
    expect(l1.margin.marginMicros).toBe(63_000 * 1e6)
    expect(l1.margin.marginBp).toBe(5250)
    // 4 × 95.000 − 4 × 47.500 = 190.000 sobre 380.000 → 50 %
    expect(l2.margin.marginBp).toBe(5000)
    expect(l1.converted).toBe(true)
  })

  it('margen de la OC suma solo las líneas con margen calculable', () => {
    expect(result.margin.saleMicros).toBe(500_000 * 1e6)
    expect(result.margin.costMicros).toBe(247_000 * 1e6)
    expect(result.margin.marginBp).toBe(5060)
    expect(result.marginMissing).toBe(0)
  })

  it('una compra sin precio deja la línea fuera del margen y la cuenta como faltante', () => {
    const noPrice = [
      po('po9', 'draft', 'USD', [
        {
          id: 'pl9',
          partId: 'p3',
          qty: 2,
          unitPrice: null,
          quoteLineId: null,
          clientOrderLinks: [{ clientOrderId: 'co1', lineId: 'cl1', qty: 2 }],
        },
      ]),
      ...purchaseOrders,
    ]
    const r = clientOrderCoverage(clientOrder, noPrice, FX)
    expect(r.lines[0].coveredQty).toBe(8)
    expect(r.lines[0].margin).toBeNull()
    expect(r.marginMissing).toBe(1)
  })

  it('OC sin líneas queda vacía y sin margen', () => {
    const r = clientOrderCoverage({ ...clientOrder, lines: [] }, purchaseOrders, FX)
    expect(r.status).toBe(COVERAGE.EMPTY)
    expect(r.margin).toBeNull()
  })

  it('property: la cantidad cubierta nunca supera lo pedido si los enlaces respetan lo disponible', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.array(fc.integer({ min: 1, max: 100 }), { maxLength: 10 }),
        (qty, requests) => {
          const order = {
            id: 'o',
            currency: 'USD',
            lines: [{ id: 'l', partId: 'p', qty, unitPrice: money(100, 'USD') }],
          }
          const pos = []
          for (const [i, want] of requests.entries()) {
            const remaining = remainingByClientLine(order, pos).get('l')
            const links = [{ clientOrderId: 'o', lineId: 'l', qty: want }]
            if (validateLinks(want, links, new Map([['l', remaining]])) !== null) continue
            pos.push(
              po(`p${i}`, 'confirmed', 'USD', [
                {
                  id: `pl${i}`,
                  partId: 'p',
                  qty: want,
                  unitPrice: money(50, 'USD'),
                  clientOrderLinks: links,
                },
              ]),
            )
          }
          const r = clientOrderCoverage(order, pos, FX)
          expect(r.lines[0].coveredQty).toBeLessThanOrEqual(qty)
          expect(r.lines[0].coveredQty + r.lines[0].remainingQty).toBe(qty)
        },
      ),
    )
  })
})

describe('coverageStatus', () => {
  it('clasifica lo cubierto contra lo pedido', () => {
    expect(coverageStatus(5, 0)).toBe(COVERAGE.NONE)
    expect(coverageStatus(5, 3)).toBe(COVERAGE.PARTIAL)
    expect(coverageStatus(5, 5)).toBe(COVERAGE.FULL)
    expect(coverageStatus(5, 6)).toBe(COVERAGE.OVER)
  })
})

describe('remainingByClientLine / validateLinks', () => {
  it('descuenta lo cubierto por otras compras y no la línea que se edita', () => {
    const all = remainingByClientLine(clientOrder, purchaseOrders)
    expect(all.get('cl1')).toBe(4)
    expect(all.get('cl2')).toBe(0)
    const editing = remainingByClientLine(clientOrder, purchaseOrders, 'pl1')
    expect(editing.get('cl1')).toBe(10)
  })

  it('rechaza enlazar más de lo que falta o más de lo que se compra', () => {
    const remaining = new Map([
      ['a', 5],
      ['b', 3],
    ])
    expect(validateLinks(8, [{ lineId: 'a', qty: 5 }], remaining)).toBeNull()
    expect(validateLinks(8, [{ lineId: 'a', qty: 6 }], remaining)).toMatch(/falta cubrir/)
    expect(
      validateLinks(
        6,
        [
          { lineId: 'a', qty: 5 },
          { lineId: 'b', qty: 3 },
        ],
        remaining,
      ),
    ).toMatch(/se compra/)
    expect(validateLinks(6, [{ lineId: 'a', qty: 0 }], remaining)).toMatch(/inválida/)
  })
})

describe('quotePriceForQty', () => {
  const quote = {
    price: { amount: 1200, currency: 'USD' },
    priceTiers: [
      { minQty: 1, amountMinor: 1200 },
      { minQty: 10, amountMinor: 1000 },
    ],
  }

  it('aplica el tramo por volumen que alcanza la cantidad', () => {
    expect(quotePriceForQty(quote, 3)).toEqual(money(1200, 'USD'))
    expect(quotePriceForQty(quote, 10)).toEqual(money(1000, 'USD'))
    expect(quotePriceForQty(quote, 50)).toEqual(money(1000, 'USD'))
  })

  it('sin moneda no hay precio', () => {
    expect(quotePriceForQty({ price: { amount: 1, currency: null } }, 1)).toBeNull()
  })
})

describe('isClientLineLinked', () => {
  it('cuenta también los enlaces de compras anuladas', () => {
    expect(isClientLineLinked('cl1', purchaseOrders)).toBe(true)
    expect(isClientLineLinked('cl3', purchaseOrders)).toBe(false)
    expect(isClientLineLinked('cl1', [purchaseOrders[2]])).toBe(true)
  })
})
