import { LOGISTICS_STATUS_LABELS_ES } from '@constants/enums'

export const PART_TABS = {
  QUOTES: 'cotizaciones',
  IDENTITY: 'identificacion',
  LOGISTICS: 'logistica',
  CUSTOMS: 'aduana',
  DEMAND: 'demanda',
}

export const TAB_LIST = [
  { value: PART_TABS.QUOTES, label: 'Cotizaciones' },
  { value: PART_TABS.IDENTITY, label: 'Identificación' },
  { value: PART_TABS.LOGISTICS, label: 'Logística' },
  { value: PART_TABS.CUSTOMS, label: 'Aduana' },
  { value: PART_TABS.DEMAND, label: 'Demanda' },
]

export const DEMAND_BASIS_LABELS_ES = { estimated: 'Estimada', historical: 'Histórica' }

export const DEMAND_SCALE_LABELS_ES = {
  casi_nunca: 'Casi nunca',
  rara_vez: 'Rara vez',
  a_veces: 'A veces',
  casi_siempre: 'Casi siempre',
}

export const CODE_STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'provisional', label: 'Provisorio' },
]

export const LOGISTICS_STATUS_OPTIONS = Object.entries(LOGISTICS_STATUS_LABELS_ES).map(
  ([value, label]) => ({ value, label }),
)
