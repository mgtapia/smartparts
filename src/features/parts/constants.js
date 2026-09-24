import { LOGISTICS_STATUS_LABELS_ES } from '@constants/enums'

export const PART_TABS = {
  QUOTES: 'quotes',
  IDENTITY: 'identity',
  LOGISTICS: 'logistics',
  CUSTOMS: 'customs',
  DEMAND: 'demand',
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

export const CODE_HELP = [
  'El código es el mismo en Chile y en China: solo se confirma.',
  'Confirmar exige una fuente citable, como un proveedor que lo reconoció al cotizar o un catálogo del fabricante. Sin fuente queda provisorio.',
]

export const LOGISTICS_HELP = [
  'El peso y el volumen definen el flete. Solo cuentan como confirmados si los dio el proveedor o se midieron.',
  'Los valores cargados por defecto son estimaciones por nombre de pieza. Se reemplazan con el peso bruto y las medidas de la caja que informe el proveedor.',
]

export const CUSTOMS_HELP = [
  'La partida arancelaria (HS) determina el arancel y si el TLC aplica. Se define con el agente de aduanas.',
]
