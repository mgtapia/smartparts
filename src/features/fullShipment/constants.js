import { SHIPPING_MODES } from '@constants/enums'

export const FULL_SHIPMENT_TABS = {
  PLAN: 'recomendacion',
  PURCHASE: 'compra',
  ANOMALIES: 'anomalias',
}

export const TAB_LIST = [
  { value: FULL_SHIPMENT_TABS.PLAN, label: 'Recomendación' },
  { value: FULL_SHIPMENT_TABS.PURCHASE, label: 'Lista de compra' },
  { value: FULL_SHIPMENT_TABS.ANOMALIES, label: 'Anomalías' },
]

export const CONTAINER_OPTIONS = [
  { value: SHIPPING_MODES.SEA_FCL_40HQ, label: "40' HC" },
  { value: SHIPPING_MODES.SEA_FCL_20, label: "20'" },
]

export const RED_REASON = 'Estimación con tarifas de referencia, sin cotización real de forwarder'
