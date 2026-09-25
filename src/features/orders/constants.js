import {
  CLIENT_ORDER_STATUS,
  CLIENT_ORDER_STATUS_LABELS_ES,
  INCOTERMS_2020,
  PURCHASE_ORDER_STATUS,
  PURCHASE_ORDER_STATUS_LABELS_ES,
} from '@constants/enums'
import { vehicleLabel } from '@features/vehicles/constants'
import { COVERAGE } from './ordersModel'

export { formatIsoDate } from '@libs/dates'

// Pestañas de /orders: la lista de OC de clientes y la de OC a proveedores.
export const ORDER_VIEWS = { CLIENTS: 'clientes', SUPPLIERS: 'proveedores' }
export const ORDER_VIEW_TABS = [
  { value: ORDER_VIEWS.CLIENTS, label: 'Clientes' },
  { value: ORDER_VIEWS.SUPPLIERS, label: 'Proveedores' },
]

export const CLIENT_ORDER_TABS = { LINES: 'lineas', PURCHASES: 'compras', DATA: 'datos' }
export const CLIENT_ORDER_TAB_LIST = [
  { value: CLIENT_ORDER_TABS.LINES, label: 'Líneas' },
  { value: CLIENT_ORDER_TABS.PURCHASES, label: 'Compras' },
  { value: CLIENT_ORDER_TABS.DATA, label: 'Datos' },
]

export const PURCHASE_ORDER_TABS = { LINES: 'lineas', DATA: 'datos' }
export const PURCHASE_ORDER_TAB_LIST = [
  { value: PURCHASE_ORDER_TABS.LINES, label: 'Líneas' },
  { value: PURCHASE_ORDER_TABS.DATA, label: 'Datos' },
]

const toOptions = (values, labels) => values.map((value) => ({ value, label: labels[value] }))

export const CLIENT_STATUS_OPTIONS = toOptions(
  Object.values(CLIENT_ORDER_STATUS),
  CLIENT_ORDER_STATUS_LABELS_ES,
)
export const PURCHASE_STATUS_OPTIONS = toOptions(
  Object.values(PURCHASE_ORDER_STATUS),
  PURCHASE_ORDER_STATUS_LABELS_ES,
)
export const ALL_STATUSES = 'all'

// Venta al cliente: normalmente CLP. Compra al proveedor: USD o CNY.
export const CLIENT_CURRENCY_OPTIONS = ['CLP', 'USD'].map((c) => ({ value: c, label: c }))
export const PURCHASE_CURRENCY_OPTIONS = ['USD', 'CNY'].map((c) => ({ value: c, label: c }))
export const INCOTERM_OPTIONS = [
  { value: 'none', label: 'Sin definir' },
  ...INCOTERMS_2020.map((i) => ({ value: i, label: i })),
]

/** Prefijo del campo de precio según la moneda. */
export const CURRENCY_ADORNMENT = { CLP: '$', USD: 'US$', CNY: '¥' }

export const COVERAGE_LABELS_ES = {
  [COVERAGE.EMPTY]: 'Sin líneas',
  [COVERAGE.NONE]: 'Sin cubrir',
  [COVERAGE.PARTIAL]: 'Parcial',
  [COVERAGE.FULL]: 'Cubierta',
  [COVERAGE.OVER]: 'Excedida',
}

/** Nombre de una OC para mostrar: su número, o que no lo tiene. */
export const orderLabel = (order) => (order?.number ? `OC ${order.number}` : 'OC sin número')

/** Hoy en 'AAAA-MM-DD', hora local: fecha por defecto de una OC nueva. */
export function todayIso(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Etiqueta de un repuesto en una lista: código y nombre. */
export const partLabel = (part) =>
  part ? `${part.code ?? 'Sin código'} · ${part.nameEs}` : 'Repuesto no encontrado'

/** Opciones de repuesto para un selector: código, nombre y vehículo, en orden alfabético. */
export const partOptions = (parts) =>
  parts
    .map((p) => ({
      value: p.id,
      label: [partLabel(p), vehicleLabel(p.vehicle)].filter(Boolean).join(' · '),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))

export const MARGIN_REASON =
  'Estimación: el costo es el precio del proveedor con su Incoterm, no el costo puesto en Chile (falta flete, seguro, arancel y gastos locales).'
export const FX_REASON = 'Convertido con el tipo de cambio de referencia, sin confirmar.'

export const CLIENT_ORDER_HELP = [
  'Cubierto: unidades de cada línea que ya tienen una compra a un proveedor enlazada. Las compras anuladas no cuentan.',
  'Margen estimado = venta de lo cubierto − precio de compra de lo cubierto. El precio de compra es el que cotizó el proveedor con su Incoterm (normalmente EXW), no el costo puesto en Chile: por eso va en rojo.',
  'Si la compra está en otra moneda se convierte con el tipo de cambio de referencia de la plataforma, sin confirmar.',
]

export const PURCHASE_ORDER_HELP = [
  'Cada línea de compra puede enlazarse a líneas de OC de clientes del mismo repuesto: así se ve qué compra cubre qué pedido.',
  'El precio es el del proveedor, en la moneda de la OC. Al elegir un repuesto de la cotización enlazada, se propone su precio para la cantidad.',
]
