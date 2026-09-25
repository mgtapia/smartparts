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
  // Contenedor completo (FCL), por tipo: flete China → San Antonio por contenedor y capacidad
  // útil. Fuentes en FCL_SOURCES. La pieza paga la parte del contenedor que ocupa (el mayor entre
  // volumen y peso); el pedido completo, los contenedores que alcanzan (redondeo hacia arriba).
  fclContainers: {
    sea_fcl_20: { freightCents: 770_000, capacityM3: 28, capacityKg: 28_000 }, // US$7.700, seimex.cl (sept 2026).
    sea_fcl_40hq: { freightCents: 855_000, capacityM3: 68, capacityKg: 26_330 }, // US$8.550 por 40', seimex.cl (sept 2026).
  },
  fclShipmentContainers: 1, // Un contenedor por embarque: sobre él se prorratean los gastos por embarque. Supuesto del equipo.
  chargeOverrides: {}, // Valores editados en pantalla, por código de SHIPMENT_CHARGES.
}

// Gasto de origen EXW → FOB como % del precio según la distancia: parte fija + variable por 100 km.
// Estimación del equipo sin fuente. Solo lo usa todavía el simulador de pedidos; el costo unitario
// calcula el transporte en China por distancia y peso (SHIPMENT_CHARGES, `inland_china`).
export const ORIGIN_COST_ESTIMATE = { baseBp: 200, bpPer100Km: 30 }

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

const SEIMEX = {
  labelEs: 'seimex.cl, flete China → Chile por contenedor (septiembre 2026)',
  url: 'https://seimex.cl/flete-china-chile-hoy',
}
const CBM_CALCULATOR = {
  labelEs: 'cbmcalculator.com, capacidad de contenedores 20 y 40 HC (abril 2026)',
  url: 'https://www.cbmcalculator.com/blog/how-many-cbm-in-a-shipping-container-20ft-40ft-40hc/',
}

// Fuentes del contenedor completo (ver `fclContainers` en DEFAULT_UNIT_COST_ASSUMPTIONS).
export const FCL_SOURCES = {
  freight: {
    sea_fcl_20: {
      ...SEIMEX,
      noteEs:
        'US$7.700 por contenedor de 20 pies desde Shanghai, Ningbo o Shenzhen; solo flete marítimo. Muy volátil: en julio 2026 el 40 pies costaba US$4.300–4.900 y en agosto US$7.300–7.900.',
    },
    sea_fcl_40hq: {
      ...SEIMEX,
      noteEs:
        'US$8.550 por contenedor de 40 pies; la fuente no distingue el High Cube, que suele cotizarse igual. Solo flete marítimo. Muy volátil: en julio 2026 costaba US$4.300–4.900 y en agosto US$7.300–7.900.',
    },
  },
  capacity: {
    sea_fcl_20: {
      ...CBM_CALCULATOR,
      noteEs:
        'Interior de ~33 m³; carga útil real de 28–30 m³ con 85–90 % de aprovechamiento, se usa 28. Carga máxima ~28.000 kg.',
    },
    sea_fcl_40hq: {
      ...CBM_CALCULATOR,
      noteEs:
        'Interior de ~76 m³; carga útil real de 65–68 m³ con 85–90 % de aprovechamiento, se usa 68. Carga máxima ~26.330 kg.',
    },
  },
  shipment: {
    labelEs: 'Supuesto del equipo, sin fuente',
    noteEs:
      'Los gastos por embarque (documentos, despacho, mínimo del agente) se reparten sobre este número de contenedores. Ajustar al pedido real.',
  },
}

const GREATHENSEN_FCL = {
  labelEs: 'Great Hensen, gastos FCL en origen en China (julio 2026)',
  url: 'https://www.greathensen.com/en/guide/china-to-europe-sea-freight-costs-breakdown.html',
}
const HENCARGO = {
  labelEs: 'Hencargo Chile, gastos locales de importación en San Antonio y Valparaíso (julio 2026)',
  url: 'https://hencargochile.com/gastos-locales-de-importacion-la-guia-definitiva-para-entender-que-te-cobran-en-los-puertos-de-chile/',
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
  // Contenedor completo (FCL). Sin consolidación, THC por m³, desconsolidación ni almacén LCL:
  // los gastos van por contenedor o por embarque.
  {
    code: 'fcl_inland_china',
    stage: 'inland',
    labelEs: 'Camión en China',
    modes: ['fcl'],
    basis: 'container_km',
    rateMicroPerKm: 3_010_000,
    minCents: 0,
    source: {
      labelEs: 'FreightAmigo, camión vs. tren en China (marzo 2026)',
      url: 'https://www.freightamigo.com/en/blog/logistics/is-trucking-cheaper-than-rail-for-domestic-china-first-mile-logistics-2025/',
      noteEs:
        'Un contenedor de 20 pies Shanghai → Ningbo, unos 300 km, cuesta RMB 5.000–8.000: se usa RMB 6.500, RMB 21,7 por km, US$3,01 con el tipo de cambio de referencia. Mismo valor para el de 40 pies. Sin fuente para el mínimo de un tramo corto.',
    },
  },
  {
    code: 'fcl_export_customs',
    stage: 'origin',
    labelEs: 'Despacho de exportación',
    modes: ['fcl'],
    basis: 'per_shipment',
    amountCents: 10000,
    source: { ...GREATHENSEN_FCL, noteEs: 'RMB 350–800 por embarque; se usa US$100.' },
  },
  {
    code: 'fcl_origin_docs',
    stage: 'origin',
    labelEs: 'B/L',
    modes: ['fcl'],
    basis: 'per_shipment',
    amountCents: 6000,
    source: { ...GREATHENSEN_FCL, noteEs: 'RMB 200–450 por embarque; se usa US$60.' },
  },
  {
    code: 'fcl_origin_thc',
    stage: 'origin',
    labelEs: 'THC de origen',
    modes: ['fcl'],
    basis: 'per_unit',
    amountCents: 11500,
    source: {
      ...GREATHENSEN_FCL,
      noteEs:
        'RMB 600–1.000 por contenedor; se usa US$115, el ejemplo de la fuente para un 40 HC, también para el de 20.',
    },
  },
  {
    code: 'fcl_vgm',
    stage: 'origin',
    labelEs: 'VGM y sello',
    modes: ['fcl'],
    basis: 'per_unit',
    amountCents: 2500,
    source: {
      ...GREATHENSEN_FCL,
      noteEs: 'Verificación de peso (VGM) US$20 y sello US$5 por contenedor.',
    },
  },
  {
    code: 'fcl_dest_thc',
    stage: 'destination',
    labelEs: 'THC de destino',
    modes: ['fcl'],
    basis: 'per_unit',
    amountCents: 15000,
    source: { ...HENCARGO, noteEs: 'US$120–180 por contenedor; se usa el punto medio.' },
  },
  {
    code: 'fcl_dest_docs',
    stage: 'destination',
    labelEs: 'B/L en destino',
    modes: ['fcl'],
    basis: 'per_shipment',
    amountCents: 9500,
    source: { ...HENCARGO, noteEs: 'US$75–115 por B/L; se usa el punto medio.' },
  },
  {
    code: 'fcl_dest_handling',
    stage: 'destination',
    labelEs: 'Handling local',
    modes: ['fcl'],
    basis: 'per_shipment',
    amountCents: 10000,
    source: { ...HENCARGO, noteEs: 'US$80–120 por despacho; se usa el punto medio.' },
  },
  {
    code: 'fcl_gate_out',
    stage: 'destination',
    labelEs: 'Retiro del contenedor',
    modes: ['fcl'],
    basis: 'per_unit',
    amountCents: 11500,
    source: {
      ...HENCARGO,
      noteEs:
        'Gate out: US$90–140 por camión, se usa el punto medio. Sin almacenaje: supone retiro dentro de los días libres.',
    },
  },
  {
    code: 'fcl_delivery',
    stage: 'destination',
    labelEs: 'Reparto a bodega',
    modes: ['fcl'],
    basis: 'per_unit',
    amountCents: 40000,
    source: {
      labelEs: 'seimex.cl, costo de importar un contenedor de China a Chile (septiembre 2026)',
      url: 'https://seimex.cl/guias/costo-importar-contenedor-china-chile',
      noteEs:
        'Camión de San Antonio a una bodega en Santiago: ≈ US$400 por un contenedor de 40 pies; se usa también para el de 20. Se supone que incluye la devolución del vacío: no hay tarifa pública aparte.',
    },
  },
  {
    code: 'customs_agent',
    stage: 'customs',
    labelEs: 'Agente de aduanas',
    modes: ['sea', 'air', 'fcl'],
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
    modes: ['sea', 'air', 'fcl'],
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
