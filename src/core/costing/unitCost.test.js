import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { money } from '../../libs/money'
import { DEFAULT_PARAM_SET, DEFAULT_FX, SHIPMENT_CHARGES } from '../../mocks/costParams'
import { computeUnitCost } from './unitCost'
import { unitShipmentCharges } from './shipmentCharges'

const ASSUMPTIONS = {
  airUsdPerKgCents: 600,
  seaUsdPerRtCents: 18000,
  ftaDutyBp: 0,
  shipmentCharges: SHIPMENT_CHARGES,
  seaShipmentRt: 4,
  airShipmentKg: 100,
}

// Pieza de 4 kg y 10.000 cm³: 0,01 R/T marítimo; ocupa 1/400 de un embarque de 4 m³.
const base = {
  unitPrice: money(10000, 'USD'), // US$ 100,00
  incoterm: 'EXW',
  originDistanceKm: 500,
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
const item = (component, code) => component.items.find((i) => i.code === code)

describe('computeUnitCost', () => {
  it('costo final = CIF + arancel + gastos en Chile + transferencia (invariante de suma)', () => {
    const c = byCode(computeUnitCost(base))
    expect(c.landedNet.usdMicro).toBe(
      c.cif.usdMicro + c.duty.usdMicro + c.localCosts.usdMicro + c.bank.usdMicro,
    )
  })

  it('CIF = FOB (precio + transporte en China + exportación) + flete + seguro', () => {
    const c = byCode(computeUnitCost(base))
    const fob = c.price.usdMicro + c.origin.usdMicro + c.originCharges.usdMicro
    expect(c.originCharges.usdMicro).toBeGreaterThan(0)
    expect(c.cif.usdMicro).toBe(fob + c.freight.usdMicro + c.insurance.usdMicro)
  })

  it('el transporte en China depende de la distancia y el peso, no del precio', () => {
    // 0,01 t cobrables × 500 km × US$0,278 = US$1,39.
    expect(byCode(computeUnitCost(base)).origin.usdMicro).toBe(1_390_000)
    const pricier = byCode(computeUnitCost({ ...base, unitPrice: money(100_000, 'USD') }))
    expect(pricier.origin.usdMicro).toBe(1_390_000)
    const farther = byCode(computeUnitCost({ ...base, originDistanceKm: 1000 }))
    expect(farther.origin.usdMicro).toBe(2_780_000)
  })

  it('mismo precio, proveedor más lejos → costo final más alto', () => {
    const near = computeUnitCost({ ...base, originDistanceKm: 60 })
    const far = computeUnitCost({ ...base, originDistanceKm: 1700 })
    expect(far.landedNetUsdMicro).toBeGreaterThan(near.landedNetUsdMicro)
  })

  it('cerca del puerto rige el mínimo del camión, prorrateado', () => {
    // 0,01 × 10 km × 0,278 = US$0,0278 < mínimo US$16 / 400 = US$0,04.
    expect(byCode(computeUnitCost({ ...base, originDistanceKm: 10 })).origin.usdMicro).toBe(40_000)
  })

  it('EXW sin distancia del proveedor no se costea: dice qué falta', () => {
    const r = computeUnitCost({ ...base, originDistanceKm: null })
    expect(r.landedNetUsdMicro).toBeNull()
    expect(r.blockers[0]).toContain('distancia')
  })

  describe('sin distancia del proveedor, con supuesto conservador', () => {
    const noDistance = { ...base, originDistanceKm: null }

    it('cobra el mayor entre el % del precio y el transporte con la distancia promedio', () => {
      // Promedio 800 km: 0,01 t × 800 × US$0,278 = US$2,22, menos que el 3 % de US$100 = US$3.
      const c = byCode(
        computeUnitCost({ ...noDistance, originFallback: { bp: 300, averageKm: 800 } }),
      )
      expect(c.origin.usdMicro).toBe(3_000_000)
      // Con 2.000 km el promedio da US$5,56 y gana la distancia.
      const far = byCode(
        computeUnitCost({ ...noDistance, originFallback: { bp: 300, averageKm: 2000 } }),
      )
      expect(far.origin.usdMicro).toBe(5_560_000)
    })

    it('nunca queda más barato que un proveedor con la distancia promedio', () => {
      const avg = computeUnitCost({ ...base, originDistanceKm: 800 })
      const missing = computeUnitCost({
        ...noDistance,
        originFallback: { bp: 300, averageKm: 800 },
      })
      expect(missing.landedNetUsdMicro).toBeGreaterThanOrEqual(avg.landedNetUsdMicro)
    })

    it('sin distancias para promediar usa solo el % del precio', () => {
      const c = byCode(
        computeUnitCost({ ...noDistance, originFallback: { bp: 300, averageKm: null } }),
      )
      expect(c.origin.usdMicro).toBe(3_000_000)
    })

    it('queda en rojo con el motivo', () => {
      const c = byCode(
        computeUnitCost({ ...noDistance, originFallback: { bp: 300, averageKm: 800 } }),
      )
      expect(c.origin.verified).toBe(false)
      expect(c.origin.reasonEs).toContain('sin distancia')
    })
  })

  it('FOB/FCA no suma transporte en China ni gastos de exportación', () => {
    const c = byCode(computeUnitCost({ ...base, incoterm: 'FOB', originDistanceKm: null }))
    expect(c.origin.usdMicro).toBe(0)
    expect(c.originCharges.usdMicro).toBe(0)
    expect(c.origin.verified).toBe(true)
  })

  it('un gasto por embarque se prorratea según la parte del embarque que ocupa la pieza', () => {
    const c = byCode(computeUnitCost(base))
    // Reparto US$195,92 × 0,01 / 4 = US$0,4898 (los gastos en Chile no se redondean a centavos).
    expect(item(c.localCosts, 'delivery_sea').usdMicro).toBe(489_800)
    // Desconsolidación US$15 por m³ × 0,01 m³ = US$0,15.
    expect(item(c.localCosts, 'deconsolidation').usdMicro).toBe(150_000)
  })

  it('prorratear da lo mismo que un embarque lleno de la pieza dividido por las piezas', () => {
    const [delivery] = unitShipmentCharges({
      charges: SHIPMENT_CHARGES.filter((c) => c.code === 'delivery_sea'),
      isAir: false,
      unitChargeable: 0.01,
      shipmentChargeable: 4,
    })
    expect(delivery.usdMicro * 400).toBe(195_920_000)
  })

  it('el agente cobra el mayor entre su porcentaje y su mínimo prorrateado', () => {
    const cheap = byCode(computeUnitCost({ ...base, unitPrice: money(100, 'USD') }))
    // Mínimo US$210,67 / 400 = US$0,5267 > 1 % de un CIF de pocos dólares.
    expect(item(cheap.localCosts, 'customs_agent').usdMicro).toBe(526_675)
    const pricey = byCode(computeUnitCost({ ...base, unitPrice: money(1_000_000, 'USD') }))
    expect(item(pricey.localCosts, 'customs_agent').usdMicro).toBe(
      Math.round(pricey.cif.usdMicro / 100),
    )
  })

  it('una pieza más grande que el embarque típico paga el embarque entero', () => {
    const huge = byCode(computeUnitCost({ ...base, volumeCm3: 8_000_000 }))
    expect(item(huge.localCosts, 'delivery_sea').usdMicro).toBe(195_920_000)
  })

  it('cada modo usa sus propios gastos', () => {
    const sea = byCode(computeUnitCost(base))
    const air = byCode(computeUnitCost({ ...base, mode: 'air' }))
    const codes = (c) => c.items.map((i) => i.code)
    expect(codes(sea.localCosts)).toContain('bonded_warehouse')
    expect(codes(air.localCosts)).not.toContain('bonded_warehouse')
    expect(codes(air.originCharges)).toContain('awb')
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

  it('un Incoterm supuesto se costea pero queda marcado como no verificado', () => {
    const r = computeUnitCost({ ...base, incotermAssumed: true })
    expect(byCode(r).origin.verified).toBe(false)
    expect(byCode(r).origin.reasonEs).toContain('supuesto')
  })

  it('sin Incoterm devuelve blocker', () => {
    expect(computeUnitCost({ ...base, incoterm: null }).blockers.length).toBe(1)
  })

  it('nada sale verificado mientras los parámetros y tarifas sean estimaciones', () => {
    const r = computeUnitCost(base)
    const unverified = r.components.filter((c) => !c.verified).map((c) => c.code)
    expect(unverified).toEqual(
      expect.arrayContaining([
        'origin',
        'originCharges',
        'freight',
        'insurance',
        'cif',
        'duty',
        'localCosts',
        'bank',
        'landedNet',
      ]),
    )
  })

  it('precio en CNY queda marcado como no verificado', () => {
    const r = computeUnitCost({ ...base, unitPrice: money(70000, 'CNY') })
    expect(byCode(r).price.verified).toBe(false)
  })

  it('invariantes de suma para cualquier pieza, precio, distancia y modo', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5_000_000 }),
        fc.integer({ min: 1, max: 200_000 }),
        fc.integer({ min: 1, max: 2_000_000 }),
        fc.integer({ min: 0, max: 3000 }),
        fc.constantFrom('sea_lcl', 'air'),
        (cents, weightG, volumeCm3, km, mode) => {
          const c = byCode(
            computeUnitCost({
              ...base,
              unitPrice: money(cents, 'USD'),
              weightG,
              volumeCm3,
              originDistanceKm: km,
              mode,
            }),
          )
          const sumItems = (x) => x.items.reduce((a, i) => a + i.usdMicro, 0)
          const fob = c.price.usdMicro + c.origin.usdMicro + c.originCharges.usdMicro
          return (
            c.landedNet.usdMicro ===
              c.cif.usdMicro + c.duty.usdMicro + c.localCosts.usdMicro + c.bank.usdMicro &&
            c.cif.usdMicro === fob + c.freight.usdMicro + c.insurance.usdMicro &&
            c.origin.usdMicro === sumItems(c.origin) &&
            c.originCharges.usdMicro === sumItems(c.originCharges) &&
            c.localCosts.usdMicro === sumItems(c.localCosts)
          )
        },
      ),
    )
  })
})
