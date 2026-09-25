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
  airUsdPerKgCents: 980, // US$9,80 por kg cobrable, aéreo Shanghai o Guangzhou a Santiago. Tarifa de referencia publicada por sino-shipping.com (sept 2026), sin cotización de forwarder; otras fuentes van de US$7 a US$11.
  seaUsdPerRtCents: 12000, // US$120 por R/T (m³) LCL, Shanghai o Ningbo a San Antonio. Referencia publicada por sino-shipping.com (sept 2026); delpagroup.com da US$80–150. Sin cotización de forwarder.
  airVolumetricDivisor: 6000, // cm³ por kg: convierte volumen a peso volumétrico (6000 estándar IATA; algunos couriers 5000).
  generalDutyBp: 600, // 6 %: arancel general, se aplica si el proveedor no tiene certificado de origen (Formulario F).
  ftaDutyBp: 0, // arancel con TLC Chile-China (solo con Formulario F): 0 % estimado, depende de la partida — sin verificar.
  defaultOriginCostBp: 300, // 3 % del precio EXW: proveedor sin distancia → el mayor entre esto y el transporte con la distancia promedio (decisión del usuario, 2026-09-25). Sin fuente.
  // Embarque típico sobre el que se prorratean los gastos por embarque: cada pieza paga la parte
  // del embarque que ocupa, como si el embarque fuera solo de esa pieza dividido por las piezas.
  seaShipmentRt: 4, // 4 m³ LCL: el ejemplo real de interbal.cl (agosto 2026). Ajustar al pedido real.
  airShipmentKg: 100, // 100 kg cobrables. Supuesto del equipo, sin fuente. Ajustar al pedido real.
  chargeOverrides: {}, // Valores editados en pantalla, por código de SHIPMENT_CHARGES.
}

// Fuente de las tarifas de flete (ver los comentarios de DEFAULT_UNIT_COST_ASSUMPTIONS).
export const FREIGHT_SOURCES = {
  sea: {
    labelEs: 'sino-shipping.com, LCL Shanghai o Ningbo → San Antonio (septiembre 2026)',
    url: 'https://www.sino-shipping.com/shipping-tax-import-china/',
    noteEs: 'delpagroup.com da US$80–150 por m³. interbal.cl pagó US$300 por 4 m³ (agosto 2026).',
  },
  air: {
    labelEs: 'sino-shipping.com, aéreo Shanghai o Guangzhou → Santiago (septiembre 2026)',
    url: 'https://www.sino-shipping.com/shipping-tax-import-china/',
    noteEs: 'Otras fuentes van de US$7 a US$11 por kg.',
  },
}

const INTERBAL = {
  labelEs: 'interbal.cl, importación real de 4 m³ Ningbo → San Antonio → Santiago (agosto 2026)',
  url: 'https://interbal.cl/cuanto-cuesta-importar-de-china-a-chile/',
}
const GREATHENSEN = {
  labelEs: 'Great Hensen, gastos LCL en origen en China (julio 2026)',
  url: 'https://www.greathensen.com/en/blog/lcl-shipping-cost-breakdown-2026.html',
}
const ROLDAN = {
  labelEs: 'Roldán Logistics, cobros comunes en carga aérea (julio 2025)',
  url: 'https://www.roldanlogistics.com/post/cobros-comunes-en-transporte-aereo-de-carga',
}

/**
 * Gastos que no son flete, seguro ni impuestos, por etapa. Referencias públicas: ninguna es una
 * cotización real, por eso la UI los muestra en rojo. Base de cobro en `basis` (ver
 * src/core/costing/shipmentCharges.js). `stage: 'origin'` suma al FOB (base del arancel); el
 * resto se suma después del CIF.
 * @type {import('../core/costing/shipmentCharges').ShipmentCharge[]}
 */
export const SHIPMENT_CHARGES = [
  {
    code: 'inland_china',
    stage: 'inland',
    labelEs: 'Transporte en China',
    modes: ['sea', 'air'],
    basis: 'distance_min',
    rateMicroPerTonKm: 278_000,
    minCents: 1600,
    source: {
      labelEs: 'importivity.com, costos de transporte interno en China (agosto 2026)',
      url: 'https://importivity.com/blog/china-inland-freight-costs/',
      noteEs:
        'RMB 1,5–2,5 por tonelada-km; se usa RMB 2, US$0,278 con el tipo de cambio de referencia. La tonelada cobrable es el mayor entre peso y m³. Mínimo: un envío chico de 140 km (Guangzhou–Shenzhen) cuesta RMB 80–150, se usa ~US$16.',
    },
  },
  {
    code: 'export_customs',
    stage: 'origin',
    labelEs: 'Despacho de exportación',
    modes: ['sea', 'air'],
    basis: 'per_shipment',
    amountCents: 6000,
    source: { ...GREATHENSEN, noteEs: 'US$40–80 por embarque; se usa el punto medio.' },
  },
  {
    code: 'origin_docs',
    stage: 'origin',
    labelEs: 'Documentos y B/L',
    modes: ['sea'],
    basis: 'per_shipment',
    amountCents: 3750,
    source: { ...GREATHENSEN, noteEs: 'US$25–50 por embarque; se usa el punto medio.' },
  },
  {
    code: 'origin_cfs',
    stage: 'origin',
    labelEs: 'Consolidación CFS',
    modes: ['sea'],
    basis: 'per_unit',
    amountCents: 1150,
    source: { ...GREATHENSEN, noteEs: 'US$8–15 por m³; se usa el punto medio.' },
  },
  {
    code: 'origin_thc',
    stage: 'origin',
    labelEs: 'THC de origen',
    modes: ['sea'],
    basis: 'per_unit',
    amountCents: 1750,
    source: { ...GREATHENSEN, noteEs: 'US$10–25 por m³; se usa el punto medio.' },
  },
  {
    code: 'origin_air_handling',
    stage: 'origin',
    labelEs: 'Manipulación en origen',
    modes: ['air'],
    basis: 'per_shipment',
    amountCents: 12500,
    source: { ...ROLDAN, noteEs: 'US$50–200 por embarque; se usa el punto medio.' },
  },
  {
    code: 'awb',
    stage: 'origin',
    labelEs: 'Guía aérea (AWB)',
    modes: ['air'],
    basis: 'per_shipment',
    amountCents: 7000,
    source: { ...ROLDAN, noteEs: 'US$40–100 por embarque; se usa el punto medio.' },
  },
  {
    code: 'deconsolidation',
    stage: 'destination',
    labelEs: 'Desconsolidación LCL',
    modes: ['sea'],
    basis: 'per_unit',
    amountCents: 1500,
    source: {
      ...INTERBAL,
      noteEs:
        'US$60 por 4 m³, es decir US$15 por m³. importando.cl (2020) indica CLP 15.000 por m³.',
    },
  },
  {
    code: 'bonded_warehouse',
    stage: 'destination',
    labelEs: 'Almacén extraportuario',
    modes: ['sea'],
    basis: 'per_unit',
    amountCents: 13200,
    source: {
      ...INTERBAL,
      noteEs:
        'US$528 por 4 m³, es decir US$132 por m³. La tarifa real es un cargo fijo más uno por m³ y varía según el almacén.',
    },
  },
  {
    code: 'delivery_sea',
    stage: 'destination',
    labelEs: 'Reparto a bodega',
    modes: ['sea'],
    basis: 'per_shipment',
    amountCents: 19592,
    source: { ...INTERBAL, noteEs: 'Reparto hasta la bodega: US$195,92 por el embarque.' },
  },
  {
    code: 'dest_air_handling',
    stage: 'destination',
    labelEs: 'Manipulación en Santiago',
    modes: ['air'],
    basis: 'per_shipment',
    amountCents: 12500,
    source: { ...ROLDAN, noteEs: 'US$50–200 por embarque; se usa el punto medio.' },
  },
  {
    code: 'delivery_air',
    stage: 'destination',
    labelEs: 'Reparto a bodega',
    modes: ['air'],
    basis: 'per_shipment',
    amountCents: 10500,
    source: {
      labelEs: '2x3.cl, precio promedio de un flete en Chile (2026)',
      url: 'https://www.2x3.cl/p/precios-flete',
      noteEs: 'CLP 100.000 promedio, llevado a US$105 con el tipo de cambio de referencia.',
    },
  },
  {
    code: 'customs_agent',
    stage: 'customs',
    labelEs: 'Agente de aduanas',
    modes: ['sea', 'air'],
    basis: 'percent_min',
    base: 'cif',
    rateBp: 100,
    minCents: 21067,
    source: {
      labelEs:
        'Agencia Pérez G., honorarios de 0,5–1,5 % del CIF con mínimo por operación, e interbal.cl (agosto 2026)',
      url: 'https://agenciaperezg.cl/honorarios-del-agente-de-aduanas/',
      noteEs:
        'Se usa 1 % del CIF. El mínimo es lo que cobró la agencia en el ejemplo de interbal.cl: US$210,67 sobre un CIF de US$6.360.',
    },
  },
  {
    code: 'bank_transfer',
    stage: 'payment',
    labelEs: 'Transferencia bancaria',
    modes: ['sea', 'air'],
    basis: 'percent_plus_fixed',
    base: 'price',
    rateBp: 60,
    amountCents: 1000,
    source: {
      labelEs: 'Wise, costos de transferencia internacional del Banco de Chile (2026)',
      url: 'https://wise.com/cl/blog/transferencia-internacional-banco-chile',
      noteEs:
        'Sobre US$2.500: 0,60 % del monto (máximo US$300) más US$10 de SWIFT, más IVA. Los bancos intermediarios pueden cobrar aparte.',
    },
  },
]
