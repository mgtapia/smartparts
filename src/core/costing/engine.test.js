import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { money } from '../../libs/money'
import { computeCosting } from './engine'

const fx = { usdClp: 950_000_000, cnyUsd: 139_000, asOf: '2026-09-17' }

function baseParams(overrides = {}) {
  return {
    id: 'test-param-set-v1',
    duty: { generalAdValoremBp: 600, rateOverridesByHs: {} },
    vat: { rateBp: 1900 },
    insurance: { rateBp: 100, markupBp: 0, minPremium: money(0, 'USD') },
    freightDefaults: {
      airVolumetricDivisor: 6000,
      seaLclWmKgPerCbm: 1000,
      seaLclMinRevenueTonsX1000: 0,
      referenceRates: {},
    },
    localCosts: [],
    dgSurcharges: [],
    thresholds: { dinRequiredFobUsd: money(0, 'USD'), courierSimplifiedMaxFobUsd: money(0, 'USD') },
    rounding: { moneyMode: 'half_up', allocationMethod: 'largest_remainder' },
    ...overrides,
  }
}

describe('computeCosting — caso de referencia (golden test)', () => {
  // Una línea, modo aéreo, números redondos elegidos para que cada paso sea
  // verificable a mano. Cualquier cambio a estos valores esperados exige
  // justificación explícita en el commit (docs/MOTOR-DE-COSTOS.md §Reproducibilidad).
  const input = {
    mode: 'air',
    lines: [
      {
        lineId: 'L1',
        partId: 'part-test',
        qty: 1,
        unitFob: money(100_000, 'USD'), // $1.000,00
        grossWeightG: 10_000, // 10 kg reales
        volumeCm3: 50_000, // 0,05 CBM → 8,33 kg volumétrico (divisor 6000) → gana el real
        originCert: 'none',
      },
    ],
    freightQuote: money(5_000, 'USD'), // $50,00 — única línea, se la lleva entera
    params: baseParams({
      localCosts: [
        {
          code: 'test_fee',
          labelEs: 'Gasto de prueba',
          type: 'fixed',
          amount: money(2_000, 'USD'), // $20,00
          allocation: 'equal_split',
        },
      ],
    }),
    fx,
  }

  const result = computeCosting(input)
  const line = result.lines[0]

  it('no genera blockers ni warnings', () => {
    expect(result.blockers).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('usa peso real (10kg > 8,33kg volumétrico con divisor 6000)', () => {
    expect(line.chargeableBasis).toBe('real')
    expect(line.chargeableUnitsMicro).toBe(10_000_000)
  })

  it('FOB, flete y seguro', () => {
    expect(line.fob).toEqual(money(1_000_000_000, 'USD')) // $1.000,00
    expect(line.freight).toEqual(money(50_000_000, 'USD')) // $50,00
    expect(line.insurance).toEqual(money(10_500_000, 'USD')) // 1% de (1000+50) = $10,50
  })

  it('CIF = FOB + flete + seguro', () => {
    expect(line.cif).toEqual(money(1_060_500_000, 'USD')) // $1.060,50
  })

  it('arancel general 6% sobre CIF (sin Form F)', () => {
    expect(line.duty).toEqual(money(63_630_000, 'USD')) // $63,63
  })

  it('IVA 19% sobre CIF + arancel', () => {
    expect(line.vat).toEqual(money(213_584_700, 'USD')) // $213,5847
  })

  it('gastos locales fijos', () => {
    expect(line.localCosts).toEqual(money(20_000_000, 'USD')) // $20,00
  })

  it('landedNet excluye IVA; cashOutlay lo incluye', () => {
    expect(line.landedNet).toEqual(money(1_144_130_000, 'USD')) // $1.144,13
    expect(line.cashOutlay).toEqual(money(1_357_714_700, 'USD')) // $1.357,7147
  })

  it('totales = suma de líneas (única línea acá)', () => {
    expect(result.totals.landedNet).toEqual(line.landedNet)
    expect(result.totals.cashOutlay).toEqual(line.cashOutlay)
    expect(result.totals.upliftBp).toBe(1441) // +14,413% sobre FOB
  })

  it('metadata de reproducibilidad', () => {
    expect(result.engineVersion).toBe('1.0.0')
    expect(result.paramSetId).toBe('test-param-set-v1')
  })
})

describe('computeCosting — mercancía peligrosa bloquea, no advierte', () => {
  it('una línea con batería no volable en modo aéreo queda blocked, no produce un número', () => {
    const input = {
      mode: 'air',
      lines: [
        {
          lineId: 'L1',
          qty: 1,
          unitFob: money(10_000, 'USD'),
          grossWeightG: 1000,
          volumeCm3: 1000,
          originCert: 'none',
          dgProfile: {
            unNumber: 'UN3480',
            hazardClass: '9',
            un383: { status: 'provided' },
            airTransport: { allowed: false, reasonNote: 'Prohibido en avión de pasajeros' },
            seaTransport: { allowed: true, lclAccepted: true },
          },
        },
      ],
      freightQuote: money(1_000, 'USD'),
      params: baseParams(),
      fx,
    }

    const result = computeCosting(input)
    expect(result.blockers.length).toBeGreaterThan(0)
    expect(result.lines[0].blocked).toBe(true)
    expect(result.lines[0].landedNet).toEqual(money(0, 'USD'))
  })
})

describe('computeCosting — invariantes estructurales (property-based)', () => {
  const lineArb = fc.record({
    lineId: fc.uuid(),
    qty: fc.integer({ min: 1, max: 100 }),
    unitFobCents: fc.integer({ min: 1, max: 10_000_000 }),
    grossWeightG: fc.integer({ min: 1, max: 500_000 }),
    volumeCm3: fc.integer({ min: 1, max: 2_000_000 }),
  })

  it('para cualquier combinación de líneas: Σ líneas === totales, exacto, en todos los campos', () => {
    fc.assert(
      fc.property(
        fc.array(lineArb, { minLength: 1, maxLength: 6 }),
        fc.integer({ min: 0, max: 50_000_00 }),
        fc.constantFrom('air', 'sea_lcl', 'sea_fcl_20', 'courier'),
        (rawLines, freightCents, mode) => {
          const lines = rawLines.map((l) => ({
            lineId: l.lineId,
            qty: l.qty,
            unitFob: money(l.unitFobCents, 'USD'),
            grossWeightG: l.grossWeightG,
            volumeCm3: l.volumeCm3,
            originCert: 'none',
          }))

          const result = computeCosting({
            mode,
            lines,
            freightQuote: money(freightCents, 'USD'),
            params: baseParams({
              localCosts: [
                {
                  code: 'agente',
                  labelEs: 'Agente de aduanas',
                  type: 'percent_with_min',
                  rateBp: 50,
                  min: money(500, 'USD'),
                  allocation: 'by_cif_value',
                },
              ],
            }),
            fx,
          })

          const fields = ['fob', 'freight', 'insurance', 'cif', 'duty', 'vat', 'localCosts', 'landedNet', 'cashOutlay']
          fields.forEach((f) => {
            const sumOfLines = result.lines.reduce((acc, ln) => acc + ln[f].amount, 0)
            expect(sumOfLines).toBe(result.totals[f].amount)
          })

          // landedNet = cif + duty + localCosts (nunca incluye IVA).
          result.lines.forEach((ln) => {
            expect(ln.landedNet.amount).toBe(ln.cif.amount + ln.duty.amount + ln.localCosts.amount)
            expect(ln.cashOutlay.amount).toBe(ln.landedNet.amount + ln.vat.amount)
          })
        },
      ),
      { numRuns: 200 },
    )
  })
})
