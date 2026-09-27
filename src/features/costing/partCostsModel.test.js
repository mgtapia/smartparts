import { describe, it, expect } from 'vitest'
import { money } from '@libs/money'
import {
  DEFAULT_FX,
  DEFAULT_PARAM_SET,
  DEFAULT_UNIT_COST_ASSUMPTIONS,
  SHIPMENT_CHARGES,
} from '@mocks/costParams'
import { SHIPPING_MODES } from '@constants/enums'
import { isOffered, salePrice } from './pricingModel'
import {
  SELECTIONS,
  bestOf,
  buildPartCosts,
  buildRecommendations,
  convenience,
  worthImportingCounts,
} from './partCostsModel'

// Datos de prueba (mocks solo en tests).
const rates = { ...DEFAULT_UNIT_COST_ASSUMPTIONS, shipmentCharges: SHIPMENT_CHARGES }
const suppliers = [
  { id: 's1', facts: {} },
  { id: 's2', facts: {} },
]
const settingsFor = () => ({
  originDistanceKm: 40,
  originDistanceConfirmed: false,
  originFallback: { bp: 300, averageKm: 40 },
})
const quote = (supplierId, cents, partType = 'original') => ({
  supplierId,
  partType,
  inferred: false,
  currency: 'USD',
  price: money(cents, 'USD'),
  incoterm: 'EXW',
})
const part = (quotes) => ({
  id: 'p1',
  weightG: 5000,
  volumeCm3: 60_000,
  quotes,
})
const costs = (mode, parts, skipKeys) =>
  buildPartCosts({
    parts,
    suppliers,
    settingsFor,
    rates,
    params: DEFAULT_PARAM_SET,
    fx: DEFAULT_FX,
    mode,
    skipKeys,
  })

describe('buildPartCosts', () => {
  const parts = [part([quote('s1', 5000), quote('s2', 3000, 'alternative')])]

  it('separa el mejor original del más barato de cualquier calidad', () => {
    const c = costs(SHIPPING_MODES.AIR, parts)
    expect(bestOf(c, 'p1', SELECTIONS.OEM).supplierId).toBe('s1')
    expect(bestOf(c, 'p1', SELECTIONS.CHEAPEST).supplierId).toBe('s2')
    expect(bestOf(c, 'p1', SELECTIONS.CHEAPEST).usdMicro).toBeLessThan(
      bestOf(c, 'p1', SELECTIONS.OEM).usdMicro,
    )
  })

  it('el aéreo de una pieza pesada cuesta más que el marítimo', () => {
    const air = bestOf(costs(SHIPPING_MODES.AIR, parts), 'p1', SELECTIONS.OEM)
    const sea = bestOf(costs(SHIPPING_MODES.SEA_LCL, parts), 'p1', SELECTIONS.OEM)
    expect(air.usdMicro).toBeGreaterThan(sea.usdMicro)
  })

  it('no cuenta las ofertas atípicas ni las inferidas', () => {
    const c = costs(SHIPPING_MODES.AIR, parts, ['p1|s1|original'])
    expect(bestOf(c, 'p1', SELECTIONS.OEM)).toBeNull()
    const inferred = [part([{ ...quote('s1', 5000), inferred: true }])]
    expect(bestOf(costs(SHIPPING_MODES.AIR, inferred), 'p1', SELECTIONS.OEM)).toBeNull()
  })

  it('un repuesto sin peso o volumen no se costea', () => {
    const c = costs(SHIPPING_MODES.AIR, [{ ...parts[0], weightG: 0 }])
    expect(c.p1).toBeUndefined()
  })
})

// Márgenes y ahorros de prueba para `convenience`/`buildRecommendations`/`worthImportingCounts`:
// margen mínimo 20 % sobre la venta, ahorro máximo 30 % (original) / 50 % (alternativo), mínimo 5 %.
const pricing = { minMarginBp: 2000, maxSavingOemBp: 3000, maxSavingAltBp: 5000, minSavingBp: 500 }

describe('convenience', () => {
  it('se ofrece si el cliente ahorra al menos el mínimo con el margen mínimo cubierto', () => {
    // Costo 7.500 → piso 9.375 (÷ 0,8); con 10.000 de referencia el piso ya ahorra 6,25 % ≥ 5 %.
    expect(convenience(7500, 10_000, 'original', pricing)).toBe(true)
    // Costo 9.600 → piso 12.000, sobre el precio de referencia: no ofrece ni el ahorro mínimo.
    expect(convenience(9600, 10_000, 'original', pricing)).toBe(false)
  })

  it('delega en la fórmula de precio de venta (mismo criterio que el Catálogo)', () => {
    // "Se ofrece" depende del margen mínimo, no de la calidad: la calidad solo cambia el precio.
    expect(convenience(9600, 10_000, 'original', pricing)).toBe(
      isOffered(
        salePrice({ costClp: 9600, baselineClp: 10_000, quality: 'original', pricing }).tier,
      ),
    )
  })

  it('sin costo o sin referencia no se puede decir', () => {
    expect(convenience(null, 10_000, 'original', pricing)).toBeNull()
    expect(convenience(9000, null, 'original', pricing)).toBeNull()
    expect(convenience(9000, 0, 'original', pricing)).toBeNull()
  })
})

describe('buildRecommendations', () => {
  const toClp = (usdMicro) => Math.round(usdMicro / 1_000_000) * 1000
  const rates = {
    pvpMarginAirBp: pricing.minMarginBp,
    pvpMarginSeaBp: pricing.minMarginBp,
    pvpMaxSavingOemBp: pricing.maxSavingOemBp,
    pvpMaxSavingAltBp: pricing.maxSavingAltBp,
    pvpMinSavingBp: pricing.minSavingBp,
  }
  const costs = {
    air: {
      p1: {
        original: { usdMicro: 30_000_000, supplierId: 's1', quality: 'original' },
        cheapest: { usdMicro: 20_000_000, supplierId: 's2', quality: 'alternative' },
      },
    },
    sea: {
      p1: {
        original: { usdMicro: 10_000_000, supplierId: 's1', quality: 'original' },
        cheapest: { usdMicro: 8_000_000, supplierId: 's2', quality: 'alternative' },
      },
    },
  }

  it('elige la opción más barata que se ofrece', () => {
    const { options, pick } = buildRecommendations(costs, 'p1', 25_000, toClp, rates)
    expect(options).toHaveLength(4)
    expect(pick).toMatchObject({ selection: 'cheapest', mode: 'sea', costClp: 8000, worthIt: true })
  })

  it('marca las que no se ofrecen y calcula la diferencia con la referencia', () => {
    const { options } = buildRecommendations(costs, 'p1', 25_000, toClp, rates)
    const oemAir = options.find((o) => o.selection === 'original' && o.mode === 'air')
    expect(oemAir.worthIt).toBe(false)
    expect(oemAir.diffBp).toBe(2000) // 30.000 sobre 25.000 = +20 %
    const cheapSea = options.find((o) => o.selection === 'cheapest' && o.mode === 'sea')
    expect(cheapSea.diffBp).toBe(-6800)
  })

  it('sin ninguna opción que se ofrezca no hay recomendación', () => {
    expect(buildRecommendations(costs, 'p1', 5_000, toClp, rates).pick).toBeNull()
  })

  it('sin costo o sin referencia no se decide', () => {
    const { options, pick } = buildRecommendations({ air: {}, sea: {} }, 'p1', 25_000, toClp, rates)
    expect(options.every((o) => o.best === null && o.worthIt === null)).toBe(true)
    expect(pick).toBeNull()
    expect(buildRecommendations(costs, 'p1', null, toClp, rates).pick).toBeNull()
  })
})

describe('worthImportingCounts', () => {
  const toClp = (usdMicro) => Math.round(usdMicro / 1_000_000) * 1000
  const rates = {
    pvpMarginAirBp: pricing.minMarginBp,
    pvpMarginSeaBp: pricing.minMarginBp,
    pvpMaxSavingOemBp: pricing.maxSavingOemBp,
    pvpMaxSavingAltBp: pricing.maxSavingAltBp,
    pvpMinSavingBp: pricing.minSavingBp,
  }
  const best = (usd) => ({
    cheapest: { usdMicro: usd * 1_000_000, supplierId: 's1', quality: 'original' },
  })
  const costs = {
    air: { a: best(30), b: best(10) }, // 30.000 y 10.000 CLP
    sea: { a: best(8), b: best(9) },
  }
  const parts = [
    { id: 'a', baselinePrice: { amount: 20_000 } },
    { id: 'b', baselinePrice: { amount: 20_000 } },
    { id: 'c', baselinePrice: { amount: 20_000 } }, // sin costo: no cuenta
    { id: 'd' }, // sin precio de referencia: no cuenta
  ]

  it('cuenta por cada vía los que se ofrecen sobre los que se pueden evaluar', () => {
    expect(worthImportingCounts(costs, parts, toClp, rates)).toEqual({
      air: { worth: 1, total: 2 },
      sea: { worth: 2, total: 2 },
    })
  })

  it('sin costos calculados no cuenta ninguno', () => {
    expect(worthImportingCounts(null, parts, toClp, rates)).toEqual({
      air: { worth: 0, total: 0 },
      sea: { worth: 0, total: 0 },
    })
  })
})

describe('formatos marítimos', () => {
  it('cada formato da un costo distinto para la misma pieza', () => {
    const parts = [part([quote('s1', 3000)])]
    const at = (mode) => bestOf(costs(mode, parts), 'p1', SELECTIONS.OEM)?.usdMicro
    const lcl = at(SHIPPING_MODES.SEA_LCL)
    const fcl20 = at(SHIPPING_MODES.SEA_FCL_20)
    const fcl40 = at(SHIPPING_MODES.SEA_FCL_40HQ)
    expect(lcl).toBeGreaterThan(0)
    expect(fcl20).toBeGreaterThan(0)
    expect(fcl40).toBeGreaterThan(0)
    expect(new Set([lcl, fcl20, fcl40]).size).toBeGreaterThan(1)
  })
})
