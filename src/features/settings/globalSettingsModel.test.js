import { describe, it, expect } from 'vitest'
import { DEFAULT_PARAM_SET } from '@mocks/costParams'
import {
  DEFAULT_GLOBAL_PARAMS,
  DEFAULT_RATES,
  buildFx,
  buildGlobalParams,
  buildParams,
  buildRates,
  pickEditable,
} from './globalSettingsModel'

describe('globalSettingsModel', () => {
  it('sin nada guardado rigen los valores de referencia', () => {
    expect(buildParams(undefined)).toEqual(DEFAULT_PARAM_SET)
    expect(buildRates(undefined).pvpMarginAirBp).toBe(DEFAULT_RATES.pvpMarginAirBp)
  })

  it('lo guardado pisa a la referencia y lo que falta la conserva', () => {
    const rates = buildRates({ pvpMarginSeaBp: 2500, generalDutyBp: 700 })
    expect(rates.pvpMarginSeaBp).toBe(2500)
    expect(rates.generalDutyBp).toBe(700)
    // El margen aéreo puede ser distinto del marítimo.
    expect(rates.pvpMarginAirBp).toBe(DEFAULT_RATES.pvpMarginAirBp)
    expect(rates.shipmentCharges.length).toBeGreaterThan(0)
  })

  it('IVA, seguro y peso por m³ del ajuste llegan al set de parámetros del motor', () => {
    const params = buildParams({ vatBp: 2000, insuranceRateBp: 60, seaLclWmKgPerCbm: 900 })
    expect(params.vat.rateBp).toBe(2000)
    expect(params.insurance.rateBp).toBe(60)
    expect(params.insurance.markupBp).toBe(DEFAULT_GLOBAL_PARAMS.insuranceMarkupBp)
    expect(params.freightDefaults.seaLclWmKgPerCbm).toBe(900)
    // Lo que no se edita queda como estaba.
    expect(params.duty).toEqual(DEFAULT_PARAM_SET.duty)
  })

  it('el dólar del ajuste llega al tipo de cambio en micros', () => {
    expect(buildFx(undefined).usdClp).toBe(DEFAULT_GLOBAL_PARAMS.usdClp * 1_000_000)
    const fx = buildFx({ usdClp: 980, fxAsOf: '2026-10-01' })
    expect(fx.usdClp).toBe(980_000_000)
    expect(fx.asOf).toBe('2026-10-01')
  })

  it('los parámetros del precio de venta y el formato marítimo son editables y tienen valor de referencia', () => {
    const rates = buildRates(undefined)
    expect(rates.pvpMaxSavingOemBp).toBe(5000)
    expect(rates.pvpMaxSavingAltBp).toBe(7000)
    expect(rates.pvpMinSavingBp).toBe(1000)
    expect(rates.pvpSeaFormat).toBe('sea_lcl')
    const picked = pickEditable(rates)
    for (const key of [
      'pvpMaxSavingOemBp',
      'pvpMaxSavingAltBp',
      'pvpMinSavingBp',
      'pvpSeaFormat',
    ]) {
      expect(picked[key]).toBeDefined()
    }
  })

  it('un valor guardado vacío no borra la referencia', () => {
    expect(buildGlobalParams({ vatBp: undefined, insuranceRateBp: null }).vatBp).toBe(
      DEFAULT_GLOBAL_PARAMS.vatBp,
    )
  })

  it('pickEditable deja solo los valores editables, sin la lista armada de gastos', () => {
    const picked = pickEditable(buildRates({}))
    expect(picked.shipmentCharges).toBeUndefined()
    expect(picked.pvpMarginAirBp).toBeDefined()
  })
})
