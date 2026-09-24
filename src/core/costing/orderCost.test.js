import { describe, it, expect } from 'vitest'
import { money } from '../../libs/money'
import { DEFAULT_PARAM_SET, DEFAULT_FX } from '../../mocks/costParams'
import { computeOrderCost } from './orderCost'

const ASSUMPTIONS = { airUsdPerKgCents: 600, seaUsdPerRtCents: 18000, ftaDutyBp: 0 }

const line = (id, qty, extra = {}) => ({
  lineId: id,
  unitPrice: money(10000, 'USD'), // US$ 100,00
  incoterm: 'EXW',
  qty,
  weightG: 4000,
  volumeCm3: 10000,
  logisticsConfirmed: true,
  ...extra,
})

const base = {
  lines: [line('a', 10), line('b', 5, { unitPrice: money(2500, 'USD') })],
  mode: 'sea_lcl',
  originCostBp: 500,
  formF: 'no',
  assumptions: ASSUMPTIONS,
  freightQuoteUsdMicro: null,
  params: DEFAULT_PARAM_SET,
  fx: DEFAULT_FX,
}

describe('computeOrderCost', () => {
  it('sin gasto de origen en EXW no calcula y dice qué falta', () => {
    const r = computeOrderCost({ ...base, originCostBp: null })
    expect(r.totals).toBeNull()
    expect(r.blockers).toContain('Falta el gasto de origen del proveedor')
  })

  it('sin tarifa ni flete cotizado no calcula', () => {
    const r = computeOrderCost({
      ...base,
      assumptions: { ...ASSUMPTIONS, seaUsdPerRtCents: null },
    })
    expect(r.totals).toBeNull()
    expect(r.blockers[0]).toMatch(/tarifa de flete marítimo/)
  })

  it('con flete cotizado no hace falta la tarifa y se usa tal cual', () => {
    const r = computeOrderCost({
      ...base,
      assumptions: { ...ASSUMPTIONS, seaUsdPerRtCents: null },
      freightQuoteUsdMicro: 200_000_000,
    })
    expect(r.totals.freightMicro).toBe(200_000_000)
    expect(r.freight.source).toBe('quote')
  })

  it('una línea sin Incoterm bloquea esa línea', () => {
    const r = computeOrderCost({ ...base, lines: [line('a', 1, { incoterm: null })] })
    expect(r.totals).toBeNull()
    expect(r.lineBlockers.a[0]).toMatch(/Sin Incoterm/)
  })

  it('el precio suma cantidad × precio unitario y el origen es el % del precio', () => {
    const r = computeOrderCost(base)
    expect(r.totals.priceMicro).toBe(10 * 100_000_000 + 5 * 25_000_000)
    expect(r.totals.originMicro).toBe(Math.round(r.totals.priceMicro * 0.05))
  })

  it('Σ líneas === total en flete, seguro, arancel, gastos locales y costo final', () => {
    const r = computeOrderCost(base)
    for (const [line, total] of [
      ['freightMicro', r.totals.freightMicro],
      ['insuranceMicro', r.totals.insuranceMicro],
      ['dutyMicro', r.totals.dutyMicro],
      ['localCostsMicro', r.totals.localCostsMicro],
      ['landedNetMicro', r.totals.landedNetMicro],
    ]) {
      expect(r.lines.reduce((s, l) => s + l[line], 0)).toBe(total)
    }
  })

  it('el costo final es CIF + arancel + gastos locales', () => {
    const t = computeOrderCost(base).totals
    const cif = t.priceMicro + t.originMicro + t.freightMicro + t.insuranceMicro
    expect(t.landedNetMicro).toBe(cif + t.dutyMicro + t.localCostsMicro)
  })

  it('incluye los costos fijos por embarque: una OC chica paga el piso del agente', () => {
    const t = computeOrderCost({
      ...base,
      lines: [line('a', 1, { unitPrice: money(500, 'USD') })],
    }).totals
    // Piso del agente de aduanas del set de parámetros: US$ 80.
    expect(t.localCostsMicro).toBeGreaterThanOrEqual(80_000_000)
  })

  it('el aéreo cobra el mayor entre peso real y volumétrico', () => {
    const heavy = computeOrderCost({ ...base, mode: 'air', lines: [line('a', 1)] })
    // 4 kg reales contra 10000 cm³ ÷ 6000 = 1,67 kg: cobra 4 kg × US$ 6 = US$ 24.
    expect(heavy.freight.chargeableUnits).toBeCloseTo(4, 6)
    expect(heavy.totals.freightMicro).toBe(24_000_000)
  })

  it('marca como sin verificar lo que no está confirmado', () => {
    const r = computeOrderCost({ ...base, lines: [line('a', 1, { logisticsConfirmed: false })] })
    expect(r.unverified).toContain('Peso y volumen sin confirmar')
    expect(r.unverified).toContain('Flete calculado con la tarifa vigente, no con una cotización')
  })
})
