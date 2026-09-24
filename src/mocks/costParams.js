// cost_param_sets — seed de arranque para poder calcular. ⚠️ NINGUNA cifra
// fiscal acá está verificada contra Aduana de Chile / SII todavía (ver
// docs/MOTOR-DE-COSTOS.md §Regla dura: nada de tasas hardcodeadas). En
// Firestore real esto es inmutable y versionado — acá es un único seed fijo.
// Import relativo (no alias) a propósito: este mock lo importa también
// scripts/seed-firestore.mjs, que corre en Node plano sin resolver @libs/*.
import { money } from '../libs/money.js'

export const DEFAULT_PARAM_SET = {
  id: 'seed-cl-2026-09-unverified',
  verificationStatus: { verifiedAgainstOfficial: false },
  duty: {
    generalAdValoremBp: 600, // 6% general — TLC Chile-China puede llevarlo a 0% con Form F por partida.
    rateOverridesByHs: {},
  },
  vat: { rateBp: 1900 }, // 19% IVA Chile.
  insurance: {
    rateBp: 50, // 0.5% del valor asegurado — referencial.
    markupBp: 1000, // +10% sobre FOB+flete para el valor asegurado.
    minPremium: money(500, 'USD'), // $5 USD piso por embarque.
  },
  freightDefaults: {
    airVolumetricDivisor: 6000,
    seaLclWmKgPerCbm: 1000,
    seaLclMinRevenueTonsX1000: 0,
    referenceRates: {},
  },
  localCosts: [
    {
      code: 'agente_aduanas',
      labelEs: 'Agente de aduanas',
      type: 'percent_with_min',
      rateBp: 100, // 1% del CIF.
      min: money(8000, 'USD'), // piso $80 USD.
      allocation: 'by_cif_value',
    },
    {
      code: 'almacenaje_handling',
      labelEs: 'Almacenaje y handling',
      type: 'percent',
      rateBp: 50, // 0.5% del CIF, referencial.
      allocation: 'by_volume',
    },
  ],
  dgSurcharges: [],
  thresholds: {
    dinRequiredFobUsd: money(100000, 'USD'),
    courierSimplifiedMaxFobUsd: money(0, 'USD'),
  },
  rounding: { moneyMode: 'half_up', allocationMethod: 'largest_remainder' },
}

// Tipo de cambio de referencia — en Fase 2 esto sale de fx_rates/{fecha}, no de un valor fijo.
export const DEFAULT_FX = { usdClp: 950_000_000, cnyUsd: 139_000, asOf: '2026-09-17' }

// Supuestos de costo unitario. ESTIMACIONES DEL EQUIPO, ninguna verificada con un
// forwarder ni con el agente de aduanas: la UI las muestra en rojo mientras siga
// así. `defaultOriginCostBp` es el costo de origen EXW→FOB por defecto (% del
// precio EXW); depende de dónde esté cada proveedor, por eso se ajusta por
// proveedor en la pantalla.
export const DEFAULT_UNIT_COST_ASSUMPTIONS = {
  airUsdPerKgCents: 600, // US$ 6,00 por kg cobrable — referencial.
  seaUsdPerRtCents: 18000, // US$ 180 por R/T (m³) LCL — referencial.
  airVolumetricDivisor: 6000, // cm³ por kg: convierte volumen a peso volumétrico (6000 estándar IATA; algunos couriers 5000).
  generalDutyBp: 600, // 6 %: arancel general, se aplica si el proveedor no tiene certificado de origen (Formulario F).
  ftaDutyBp: 0, // arancel con TLC Chile-China (solo con Formulario F): 0 % estimado, depende de la partida — sin verificar.
  defaultOriginCostBp: 500, // 5% del precio EXW — placeholder, sin fuente.
}
