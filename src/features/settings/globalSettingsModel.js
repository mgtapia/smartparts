// Parámetros globales de costo y venta: lo que se guarda en la base (versión vigente de
// `global_settings`) y cómo se arma con lo que falte. Puro: sin React ni Firebase.
import {
  DEFAULT_FX,
  DEFAULT_PARAM_SET,
  DEFAULT_UNIT_COST_ASSUMPTIONS,
  SHIPMENT_CHARGES,
} from '@mocks/costParams'

export const { defaultOriginCostBp, ...DEFAULT_RATES } = DEFAULT_UNIT_COST_ASSUMPTIONS

/** Tarifas, tamaño del embarque, gastos, aranceles y márgenes: lo que se edita y se guarda. */
export const EDITABLE_KEYS = Object.keys(DEFAULT_RATES)

/** Del set de parámetros, lo que se edita en Ajustes. */
export const DEFAULT_GLOBAL_PARAMS = Object.freeze({
  vatBp: DEFAULT_PARAM_SET.vat.rateBp,
  insuranceRateBp: DEFAULT_PARAM_SET.insurance.rateBp,
  insuranceMarkupBp: DEFAULT_PARAM_SET.insurance.markupBp,
  seaLclWmKgPerCbm: DEFAULT_PARAM_SET.freightDefaults.seaLclWmKgPerCbm,
  // Tipo de cambio de referencia: pesos por dólar y desde cuándo rige.
  usdClp: Math.round(DEFAULT_FX.usdClp / 1e6),
  fxAsOf: DEFAULT_FX.asOf,
})

/**
 * Supuestos completos desde lo guardado. Una versión guardada antes de que existiera una clave
 * no la trae: toma el valor de referencia. Los gastos por embarque son la lista de referencia con
 * los valores editados encima.
 */
export function buildRates(stored) {
  const merged = { ...DEFAULT_RATES, ...stored }
  const overrides = merged.chargeOverrides ?? {}
  const fclContainers = Object.fromEntries(
    Object.entries(DEFAULT_RATES.fclContainers).map(([key, spec]) => [
      key,
      { ...spec, ...stored?.fclContainers?.[key] },
    ]),
  )
  return {
    ...merged,
    fclContainers,
    shipmentCharges: SHIPMENT_CHARGES.map((c) => ({ ...c, ...overrides[c.code] })),
  }
}

/** Solo los valores editables, sin la lista de gastos armada. */
export function pickEditable(rates) {
  return Object.fromEntries(EDITABLE_KEYS.map((key) => [key, rates[key]]))
}

/** Los parámetros globales guardados, completos. */
export function buildGlobalParams(stored) {
  const defined = Object.entries(stored ?? {}).filter(([, v]) => v != null)
  return { ...DEFAULT_GLOBAL_PARAMS, ...Object.fromEntries(defined) }
}

/** Tipo de cambio para el motor y las pantallas, desde el ajuste global (pesos por dólar en micros). */
export function buildFx(globalParams) {
  const g = buildGlobalParams(globalParams)
  return { ...DEFAULT_FX, usdClp: g.usdClp * 1_000_000, asOf: g.fxAsOf }
}

/** Set de parámetros del motor con IVA, seguro y peso por m³ del ajuste global. */
export function buildParams(globalParams) {
  const g = buildGlobalParams(globalParams)
  return {
    ...DEFAULT_PARAM_SET,
    vat: { ...DEFAULT_PARAM_SET.vat, rateBp: g.vatBp },
    insurance: {
      ...DEFAULT_PARAM_SET.insurance,
      rateBp: g.insuranceRateBp,
      markupBp: g.insuranceMarkupBp,
    },
    freightDefaults: {
      ...DEFAULT_PARAM_SET.freightDefaults,
      seaLclWmKgPerCbm: g.seaLclWmKgPerCbm,
    },
  }
}
