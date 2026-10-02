import { SHIPPING_MODES } from '@constants/enums'

export const CONTAINER_OPTIONS = [
  { value: SHIPPING_MODES.SEA_FCL_40HQ, label: "40' HC" },
  { value: SHIPPING_MODES.SEA_FCL_20, label: "20'" },
]

export const OPTION_OPTIONS = [
  { value: 'original', label: 'Original' },
  { value: 'cheapest', label: 'Más barato' },
]

export const RED_REASON = 'Estimación con tarifas de referencia, sin cotización real de forwarder'
