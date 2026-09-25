import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { money } from '../../libs/money'
import {
  DEFAULT_PARAM_SET,
  DEFAULT_FX,
  DEFAULT_UNIT_COST_ASSUMPTIONS,
  SHIPMENT_CHARGES,
} from '../../mocks/costParams'
import { containerShare, containersNeeded } from './containers'
import { computeUnitCost } from './unitCost'
import { costShipment } from './purchasePlan'

const ASSUMPTIONS = { ...DEFAULT_UNIT_COST_ASSUMPTIONS, shipmentCharges: SHIPMENT_CHARGES }
const SPEC_20 = ASSUMPTIONS.fclContainers.sea_fcl_20
const SPEC_40 = ASSUMPTIONS.fclContainers.sea_fcl_40hq
const M3 = 1_000_000 // cm³
const KG = 1000 // g
const common = { assumptions: ASSUMPTIONS, params: DEFAULT_PARAM_SET, fx: DEFAULT_FX }

const byCode = (r) => Object.fromEntries(r.components.map((c) => [c.code, c]))
const chargeCents = (code) => SHIPMENT_CHARGES.find((c) => c.code === code).amountCents

describe('contenedores', () => {
  it('por volumen: 193 m³ livianos son 3 contenedores de 40 HC', () => {
    expect(containersNeeded(20_000 * KG, 193 * M3, SPEC_40)).toBe(3)
  })

  it('por peso: 60 t en 10 m³ son 3 contenedores de 40 HC (26.330 kg cada uno)', () => {
    expect(containersNeeded(60_000 * KG, 10 * M3, SPEC_40)).toBe(3)
    expect(containerShare(60_000 * KG, 10 * M3, SPEC_40).basis).toBe('weight')
  })

  it('justo la capacidad es un contenedor; un cm³ más son dos; sin carga, cero', () => {
    expect(containersNeeded(1, 68 * M3, SPEC_40)).toBe(1)
    expect(containersNeeded(1, 68 * M3 + 1, SPEC_40)).toBe(2)
    expect(containersNeeded(0, 0, SPEC_40)).toBe(0)
  })

  it('siempre alcanzan para el volumen y el peso, sin sobrar uno entero', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500_000_000 }),
        fc.integer({ min: 1, max: 500_000_000 }),
        fc.constantFrom(SPEC_20, SPEC_40),
        (weightG, volumeCm3, spec) => {
          const n = containersNeeded(weightG, volumeCm3, spec)
          const fitsVolume = n * spec.capacityM3 * M3 >= volumeCm3
          const fitsWeight = n * spec.capacityKg * KG >= weightG
          const oneLessFits =
            (n - 1) * spec.capacityM3 * M3 >= volumeCm3 && (n - 1) * spec.capacityKg * KG >= weightG
          return n >= 1 && fitsVolume && fitsWeight && !oneLessFits
        },
      ),
    )
  })
})

describe('costo unitario en contenedor completo', () => {
  // Pieza de 4 kg y 10.000 cm³: ocupa 0,01 / 68 de un 40 HC.
  const base = {
    unitPrice: money(10000, 'USD'),
    incoterm: 'EXW',
    originDistanceKm: 500,
    formF: 'no',
    weightG: 4000,
    volumeCm3: 10000,
    logisticsConfirmed: false,
    mode: 'sea_fcl_40hq',
    ...common,
  }

  it('costo final = CIF + arancel + gastos en Chile + banco; CIF = FOB + flete + seguro', () => {
    const c = byCode(computeUnitCost(base))
    expect(c.landedNet.usdMicro).toBe(
      c.cif.usdMicro + c.duty.usdMicro + c.localCosts.usdMicro + c.bank.usdMicro,
    )
    const fob = c.price.usdMicro + c.origin.usdMicro + c.originCharges.usdMicro
    expect(c.cif.usdMicro).toBe(fob + c.freight.usdMicro + c.insurance.usdMicro)
  })

  it('la pieza paga la parte del contenedor que ocupa', () => {
    // Por volumen: 0,1 m³ / 68 m³ = 0,00147 del contenedor (el peso, 4 kg / 26.330 kg, es menos).
    const bulky = byCode(computeUnitCost({ ...base, volumeCm3: 100_000 }))
    // 0,00147 × US$8.550 = US$12,57 (el motor redondea el flete a centavos).
    expect(bulky.freight.usdMicro).toBe(12_570_000)
    // Camión en China: US$3,01 por km × 500 km × 0,00147 contenedor = US$2,21.
    expect(bulky.origin.usdMicro).toBe(2_210_000)
    // Por peso: 4 kg / 26.330 kg = 0,000152 del contenedor, más que 0,01 m³ / 68 m³.
    const c = byCode(computeUnitCost(base))
    expect(c.freight.usdMicro).toBe(1_300_000)
    expect(c.freight.formulaEs).toContain('por peso')
    // Sin desconsolidación ni almacén LCL.
    const codes = c.localCosts.items.map((i) => i.code)
    expect(codes).toContain('fcl_dest_thc')
    expect(codes).not.toContain('deconsolidation')
    expect(codes).not.toContain('bonded_warehouse')
  })

  it('sin flete del contenedor no se costea: dice qué falta', () => {
    const r = computeUnitCost({
      ...base,
      assumptions: { ...ASSUMPTIONS, fclContainers: {} },
    })
    expect(r.landedNetUsdMicro).toBeNull()
    expect(r.blockers[0]).toContain('contenedor')
  })

  it('invariantes para cualquier pieza, precio y tipo de contenedor', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 200_000 }),
        fc.integer({ min: 1, max: 2_000_000 }),
        fc.constantFrom('sea_fcl_20', 'sea_fcl_40hq'),
        fc.constantFrom('EXW', 'FOB'),
        (cents, weightG, volumeCm3, mode, incoterm) => {
          const c = byCode(
            computeUnitCost({
              ...base,
              unitPrice: money(cents, 'USD'),
              weightG,
              volumeCm3,
              mode,
              incoterm,
            }),
          )
          const fob = c.price.usdMicro + c.origin.usdMicro + c.originCharges.usdMicro
          return (
            c.cif.usdMicro === fob + c.freight.usdMicro + c.insurance.usdMicro &&
            c.landedNet.usdMicro ===
              c.cif.usdMicro + c.duty.usdMicro + c.localCosts.usdMicro + c.bank.usdMicro &&
            Object.values(c).every((x) => Number.isInteger(x.usdMicro))
          )
        },
      ),
      { numRuns: 80 },
    )
  })
})

describe('pedido completo en contenedor completo', () => {
  const supplier = (id, km) => ({
    id,
    originDistanceKm: km,
    originFallback: { bp: 300, averageKm: 500 },
    formF: 'unknown',
  })
  const suppliers = new Map([
    ['A', supplier('A', 300)],
    ['B', supplier('B', 1200)],
  ])
  const line = (partId, supplierId, qty, weightG, volumeCm3, cents) => ({
    part: { partId, qty, weightG, volumeCm3 },
    offer: {
      offerId: `${supplierId}-${partId}`,
      partId,
      supplierId,
      partType: 'original',
      unitPrice: money(cents, 'USD'),
      incoterm: 'EXW',
    },
  })
  // Pedido grande: 190 m³ y 38 t entre dos proveedores.
  const big = [
    line('p1', 'A', 1000, 20_000, 100_000, 5000),
    line('p2', 'B', 900, 20_000, 100_000, 8000),
  ]
  // Pedido chico: 1 m³.
  const small = [line('p1', 'A', 10, 5000, 100_000, 5000)]
  const cost = (assignments, mode) => costShipment({ assignments, suppliers, mode, ...common })

  it('flete y gastos por contenedor van por los contenedores del pedido consolidado', () => {
    const r = cost(big, 'sea_fcl_40hq')
    expect(r.containers).toBe(3)
    expect(r.totals.freight).toBe(3 * SPEC_40.freightCents * 10_000)
    const perContainerChile =
      chargeCents('fcl_dest_thc') + chargeCents('fcl_gate_out') + chargeCents('fcl_delivery')
    const perShipmentChile = chargeCents('fcl_dest_docs') + chargeCents('fcl_dest_handling')
    const agent = r.totals.chile - (3 * perContainerChile + perShipmentChile) * 10_000
    // Lo que queda es el agente de aduanas: 1 % del CIF (mayor que el mínimo a esta escala).
    expect(agent).toBe(Math.round(r.totals.cif / 100))
  })

  it('invariantes de suma: CIF, costo final y Σ líneas', () => {
    for (const mode of ['sea_fcl_20', 'sea_fcl_40hq']) {
      const { totals: t, lines } = cost(big, mode)
      expect(t.cif).toBe(t.goods + t.inland + t.export + t.freight + t.insurance)
      expect(t.landedNet).toBe(t.cif + t.duty + t.chile + t.bank)
      expect(lines.reduce((a, l) => a + l.landedNet, 0)).toBe(t.landedNet)
    }
  })

  it('invariantes para cualquier canasta', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            qty: fc.integer({ min: 1, max: 500 }),
            cents: fc.integer({ min: 1, max: 500_000 }),
            weightG: fc.integer({ min: 1, max: 80_000 }),
            volumeCm3: fc.integer({ min: 1, max: 900_000 }),
            supplierId: fc.constantFrom('A', 'B'),
            incoterm: fc.constantFrom('EXW', 'EXW', 'FOB'),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        fc.constantFrom('sea_fcl_20', 'sea_fcl_40hq'),
        (rows, mode) => {
          const r = cost(
            rows.map((x, i) => {
              const l = line(`p${i}`, x.supplierId, x.qty, x.weightG, x.volumeCm3, x.cents)
              return { ...l, offer: { ...l.offer, incoterm: x.incoterm } }
            }),
            mode,
          )
          const t = r.totals
          const weight = rows.reduce((a, x) => a + x.weightG * x.qty, 0)
          const volume = rows.reduce((a, x) => a + x.volumeCm3 * x.qty, 0)
          return (
            r.containers === containersNeeded(weight, volume, ASSUMPTIONS.fclContainers[mode]) &&
            t.cif === t.goods + t.inland + t.export + t.freight + t.insurance &&
            t.landedNet === t.cif + t.duty + t.chile + t.bank &&
            r.lines.reduce((a, l) => a + l.landedNet, 0) === t.landedNet &&
            r.bySupplier.reduce((a, s) => a + s.export, 0) === t.export
          )
        },
      ),
      { numRuns: 60 },
    )
  })

  it('pedido grande: contenedor completo sale más barato que LCL', () => {
    const lcl = cost(big, 'sea_lcl').totals.landedNet
    expect(cost(big, 'sea_fcl_40hq').totals.landedNet).toBeLessThan(lcl)
    expect(cost(big, 'sea_fcl_20').totals.landedNet).toBeLessThan(lcl)
  })

  it('pedido chico: LCL sale más barato que un contenedor completo', () => {
    const lcl = cost(small, 'sea_lcl').totals.landedNet
    expect(lcl).toBeLessThan(cost(small, 'sea_fcl_20').totals.landedNet)
    expect(lcl).toBeLessThan(cost(small, 'sea_fcl_40hq').totals.landedNet)
  })
})
