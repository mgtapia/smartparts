export const TRIAL_TABS = {
  PLAN: 'recomendacion',
  PURCHASE: 'compra',
  SENSITIVITY: 'sensibilidad',
  EXCLUDED: 'fuera',
  ANOMALIES: 'anomalias',
  MISSING: 'faltantes',
}

export const TAB_LIST = [
  { value: TRIAL_TABS.PLAN, label: 'Recomendación' },
  { value: TRIAL_TABS.PURCHASE, label: 'Lista de compra' },
  { value: TRIAL_TABS.SENSITIVITY, label: 'Sensibilidad' },
  { value: TRIAL_TABS.EXCLUDED, label: 'Fuera del pedido' },
  { value: TRIAL_TABS.ANOMALIES, label: 'Anomalías' },
  { value: TRIAL_TABS.MISSING, label: 'Faltantes' },
]

export const OPTION_LABELS_ES = { original: 'Original', cheapest: 'Más barato' }

export const CASE_LABELS_ES = {
  A: 'Volar todo',
  B: 'Volar solo lo que conviene',
  C: 'Volar solo el top de demanda',
}

import { MARGINS_BP } from './airTrialModel'

export const MARGIN_OPTIONS = MARGINS_BP.map((bp) => ({
  value: bp,
  label: `Margen ${bp / 100} %`,
}))

export const RED_REASON = 'Estimación con tarifas de referencia, sin cotización real de forwarder'

/** Pesos chilenos en texto, con separador de miles. */
export const formatClp = (n) => `CLP ${Math.round(n).toLocaleString('es-CL')}`

/** Pesos chilenos en millones, para totales grandes. */
export const formatClpMillions = (n) => {
  const m = n / 1_000_000
  return `${m < 0 ? '−' : ''}CLP ${Math.abs(m).toLocaleString('es-CL', { maximumFractionDigits: 1 })} M`
}
