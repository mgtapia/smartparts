// Cotizaciones — SINTÉTICAS. Todavía no hay sourcing real en China (Fase 3,
// ver .agent/ROADMAP.md); estos valores sirven para probar el comparador y la
// calculadora de costos con números plausibles, no son cotizaciones reales.
// Regla dura respetada igual acá: ningún part_type 'original' viene 'auto_confirmed'
// (ver docs/INTEGRACIONES-CHINA.md §Chino y matching).

function quote(q) {
  return { currency: 'USD', matchStatus: 'pending_review', ...q }
}

export const QUOTES = [
  quote({
    id: 'q_caja_reductora_alt',
    partId: 'part_b018580',
    supplierId: 'sup_ningbo_ev_supply',
    partType: 'alternative',
    unitPriceUsd: 2450,
    moq: 5,
    capturedAt: '2026-09-12',
    validUntil: '2026-10-12',
    matchScore: 0.81,
    matchStatus: 'pending_review',
  }),
  quote({
    id: 'q_puerta_del_der_alt',
    partId: 'part_b004285',
    supplierId: 'sup_taizhou_autoparts',
    partType: 'alternative',
    unitPriceUsd: 310,
    moq: 10,
    capturedAt: '2026-09-10',
    validUntil: '2026-09-20',
    matchScore: 0.88,
    matchStatus: 'pending_review',
  }),
  quote({
    id: 'q_puerta_del_der_orig',
    partId: 'part_b004285',
    supplierId: 'sup_ningbo_ev_supply',
    partType: 'original',
    unitPriceUsd: 580,
    moq: 10,
    capturedAt: '2026-09-11',
    validUntil: '2026-10-11',
    matchScore: 0.95,
    matchStatus: 'pending_review', // nunca auto_confirmed para 'original'
  }),
  quote({
    id: 'q_optico_del_der_alt',
    partId: 'part_b018789',
    supplierId: 'sup_taizhou_autoparts',
    partType: 'alternative',
    unitPriceUsd: 145,
    moq: 20,
    capturedAt: '2026-09-14',
    validUntil: '2026-10-14',
    matchScore: 0.9,
    matchStatus: 'auto_confirmed', // alternative sí puede auto-confirmarse por código exacto
  }),
  quote({
    id: 'q_tapabarro_der_del_alt',
    partId: 'part_5322006',
    supplierId: 'sup_guangzhou_aftermarket',
    partType: 'alternative',
    unitPriceUsd: 62,
    moq: 1,
    capturedAt: '2026-09-15',
    validUntil: '2026-10-15',
    matchScore: 0.86,
    matchStatus: 'auto_confirmed',
  }),
  quote({
    id: 'q_terminales_carga_orig',
    partId: 'part_b018324',
    supplierId: 'sup_ningbo_ev_supply',
    partType: 'original',
    unitPriceUsd: 610,
    moq: 5,
    capturedAt: '2026-09-13',
    validUntil: '2026-09-23',
    matchScore: 0.79,
    matchStatus: 'pending_review',
  }),
  quote({
    id: 'q_amortiguador_dongfeng_alt',
    partId: 'part_4141013',
    supplierId: 'sup_taizhou_autoparts',
    partType: 'alternative',
    unitPriceUsd: 38,
    moq: 50,
    capturedAt: '2026-09-09',
    validUntil: '2026-10-09',
    matchScore: 0.83,
    matchStatus: 'auto_confirmed',
  }),
  quote({
    id: 'q_absorbedor_frontal_alt',
    partId: 'part_b004163',
    supplierId: 'sup_guangzhou_aftermarket',
    partType: 'alternative',
    unitPriceUsd: 6.2,
    moq: 20,
    capturedAt: '2026-09-08',
    validUntil: '2026-09-18', // por vencer — para probar alertas
    matchScore: 0.72,
    matchStatus: 'pending_review',
  }),
  quote({
    id: 'q_kia_amortiguador_alt',
    partId: 'part_54651ao200',
    supplierId: 'sup_taizhou_autoparts',
    partType: 'alternative',
    unitPriceUsd: 52,
    moq: 50,
    capturedAt: '2026-09-11',
    validUntil: '2026-10-11',
    matchScore: 0.77,
    matchStatus: 'pending_review',
  }),
  quote({
    id: 'q_kia_bandeja_alt',
    partId: 'part_54501at000',
    supplierId: 'sup_ningbo_ev_supply',
    partType: 'alternative',
    unitPriceUsd: 180,
    moq: 10,
    capturedAt: '2026-09-12',
    validUntil: '2026-10-12',
    matchScore: 0.74,
    matchStatus: 'pending_review',
  }),
]

export function listQuotesByPart(partId) {
  return QUOTES.filter((q) => q.partId === partId)
}

export function getQuote(id) {
  return QUOTES.find((q) => q.id === id) || null
}
