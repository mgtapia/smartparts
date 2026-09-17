// Enums de dominio — deben coincidir con los typedefs de src/core/costing/types.js
// y con docs/MODELO-DE-DATOS.md. Única fuente de verdad para valores de UI (labels ES).

export const SHIPPING_MODES = Object.freeze({
  SEA_LCL: 'sea_lcl',
  SEA_FCL_20: 'sea_fcl_20',
  SEA_FCL_40HQ: 'sea_fcl_40hq',
  AIR: 'air',
  COURIER: 'courier',
})

export const SHIPPING_MODE_LABELS_ES = Object.freeze({
  [SHIPPING_MODES.SEA_LCL]: 'Marítimo LCL',
  [SHIPPING_MODES.SEA_FCL_20]: "Marítimo FCL 20'",
  [SHIPPING_MODES.SEA_FCL_40HQ]: "Marítimo FCL 40' HQ",
  [SHIPPING_MODES.AIR]: 'Aéreo',
  [SHIPPING_MODES.COURIER]: 'Courier',
})

export const CODE_STATUS = Object.freeze({
  MISSING: 'missing',
  PROVISIONAL: 'provisional',
  CONFIRMED: 'confirmed',
})

export const CODE_STATUS_LABELS_ES = Object.freeze({
  [CODE_STATUS.MISSING]: 'Sin código',
  [CODE_STATUS.PROVISIONAL]: 'Provisorio',
  [CODE_STATUS.CONFIRMED]: 'Confirmado',
})

export const DEMAND_BASIS = Object.freeze({
  ESTIMATED: 'estimated',
  HISTORICAL: 'historical',
})

export const DEMAND_SCALE = Object.freeze({
  CASI_NUNCA: 'casi_nunca',
  RARA_VEZ: 'rara_vez',
  A_VECES: 'a_veces',
  CASI_SIEMPRE: 'casi_siempre',
})

export const PART_TYPE = Object.freeze({
  ORIGINAL: 'original',
  ALTERNATIVE: 'alternative',
})

export const MATCH_STATUS = Object.freeze({
  AUTO_CONFIRMED: 'auto_confirmed',
  PENDING_REVIEW: 'pending_review',
  REJECTED: 'rejected',
})

export const ORIGIN_CERT = Object.freeze({
  FORM_F: 'form_f',
  NONE: 'none',
  PENDING: 'pending',
})

export const INCOTERMS = Object.freeze(['EXW', 'FOB', 'CIF', 'DDP'])

export const USER_ROLES = Object.freeze({
  ADMIN: 'admin',
  BUYER: 'buyer',
  VIEWER: 'viewer',
})

export const SOURCE_PLATFORMS = Object.freeze({
  ALIEXPRESS: 'aliexpress',
  ALIBABA: 'alibaba',
  ALIBABA_1688: '1688',
  MADE_IN_CHINA: 'made_in_china',
  MANUAL: 'manual',
})
