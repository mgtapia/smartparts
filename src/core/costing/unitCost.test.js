import { describe, it, expect } from 'vitest'
import { money } from '../../libs/money'
import { DEFAULT_PARAM_SET, DEFAULT_FX } from '../../mocks/costParams'
import { computeUnitCost } from './unitCost'

const ASSUMPTIONS = { airUsdPerKgCents: 600, seaUsdPerRtCents: 18000, ftaDutyBp: 0 }

const base = {
  unitPrice: money(10000, 'USD'), // US$ 100,00
  incoterm: 'EXW',
  originCostBp: 500,
  formF: 'no',
  weightG: 4000,
  volumeCm3: 10000,
  logisticsConfirmed: false,
  mode: 'sea_lcl',
  assumptions: ASSUMPTIONS,
  params: DEFAULT_PARAM_SET,
  fx: DEFAULT_FX,
}

const byCode = (r) => Object.fromEntries(r.components.map((c) => [c.code, c]))

describe('computeUnitCost', () => {
  it('EXW suma el costo de origen (% del precio) antes del flete', () => {
    const r = computeUnitCost(base)
    const c = byCode(r)
    // US$ 100 × 5% = US$ 5 de origen (en micros de USD).
    expect(c.origin.usdMicro).toBe(5_000_000)
    expect(c.price.usdMicro).toBe(100_000_000)
  })

  it('FOB/FCA no suma costo de origen', () => {
    const r = computeUnitCost({ ...base, incoterm: 'FOB' })
    expect(byCode(r).origin.usdMicro).toBe(0)
    expect(byCode(r).origin.verified).toBe(true)
  })

  it('costo final = CIF + arancel + gastos locales (invariante de suma)', () => {
    const c = byCode(computeUnitCost(base))
    expect(c.landedNet.usdMicro).toBe(c.cif.usdMicro + c.duty.usdMicro + c.localCosts.usdMicro)
  })

  it('CIF = FOB (precio + origen) + flete + seguro', () => {
    const c = byCode(computeUnitCost(base))
    const fob = c.price.usdMicro + c.origin.usdMicro
    expect(c.cif.usdMicro).toBe(fob + c.freight.usdMicro + c.insurance.usdMicro)
  })

  it('no aplica mínimos por embarque: una pieza barata no paga el piso del agente', () => {
    const cheap = computeUnitCost({ ...base, unitPrice: money(500, 'USD') })
    // El piso del agente en el param set es US$ 80: si se colara, el costo
    // final de una pieza de US$ 5 sería mayor a US$ 80.
    expect(byCode(cheap).landedNet.usdMicro).toBeLessThan(80_000_000)
  })

  it('con Form F usa la tasa TLC supuesta; sin él, el arancel general', () => {
    const general = byCode(computeUnitCost(base))
    const fta = byCode(computeUnitCost({ ...base, formF: 'yes' }))
    expect(general.duty.usdMicro).toBeGreaterThan(0)
    expect(fta.duty.usdMicro).toBe(0)
    expect(fta.landedNet.usdMicro).toBeLessThan(general.landedNet.usdMicro)
  })

  it('el arancel general de los supuestos pisa el del set de parámetros', () => {
    const low = byCode(
      computeUnitCost({ ...base, assumptions: { ...ASSUMPTIONS, generalDutyBp: 0 } }),
    )
    const high = byCode(
      computeUnitCost({ ...base, assumptions: { ...ASSUMPTIONS, generalDutyBp: 1200 } }),
    )
    expect(low.duty.usdMicro).toBe(0)
    expect(high.duty.usdMicro).toBeGreaterThan(byCode(computeUnitCost(base)).duty.usdMicro)
  })

  it('aéreo cobra el mayor entre peso real y volumétrico, con el divisor editable', () => {
    const bulky = { ...base, mode: 'air', weightG: 1000, volumeCm3: 60000 }
    const dense = { ...base, mode: 'air', weightG: 10000, volumeCm3: 1000 }
    expect(byCode(computeUnitCost(bulky)).freight.formulaEs).toContain('volumétrico')
    expect(byCode(computeUnitCost(dense)).freight.formulaEs).toContain('real')
    const wide = byCode(
      computeUnitCost({ ...bulky, assumptions: { ...ASSUMPTIONS, airVolumetricDivisor: 5000 } }),
    )
    const std = byCode(
      computeUnitCost({ ...bulky, assumptions: { ...ASSUMPTIONS, airVolumetricDivisor: 6000 } }),
    )
    expect(wide.freight.usdMicro).toBeGreaterThan(std.freight.usdMicro)
  })

  it('aéreo cuesta más que marítimo para una pieza liviana y compacta', () => {
    const sea = byCode(computeUnitCost(base))
    const air = byCode(computeUnitCost({ ...base, mode: 'air' }))
    expect(air.freight.usdMicro).toBeGreaterThan(sea.freight.usdMicro)
  })

  it('un Incoterm que no sabemos llevar a FOB devuelve blocker, no un número', () => {
    const r = computeUnitCost({ ...base, incoterm: 'DDP' })
    expect(r.blockers.length).toBe(1)
    expect(r.landedNetUsdMicro).toBeNull()
  })

  it('sin Incoterm devuelve blocker', () => {
    expect(computeUnitCost({ ...base, incoterm: null }).blockers.length).toBe(1)
  })

  it('nada sale verificado mientras los parámetros y tarifas sean estimaciones', () => {
    const r = computeUnitCost({ ...base, unitPrice: money(10000, 'USD') })
    const unverified = r.components.filter((c) => !c.verified).map((c) => c.code)
    expect(unverified).toEqual(
      expect.arrayContaining(['origin', 'freight', 'insurance', 'cif', 'duty', 'landedNet']),
    )
  })

  it('precio en CNY queda marcado como no verificado', () => {
    const r = computeUnitCost({ ...base, unitPrice: money(70000, 'CNY') })
    expect(byCode(r).price.verified).toBe(false)
  })
})
