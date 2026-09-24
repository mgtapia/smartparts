import { SUPPLIER_TYPE, SUPPLIER_TYPE_LABELS_ES } from '@constants/enums'

export const SUPPLIER_TABS = {
  QUOTES: 'cotizaciones',
  IDENTITY: 'identificacion',
  CONTACT: 'contacto',
  TERMS: 'condiciones',
  DECLARATIONS: 'declaraciones',
}

export const TAB_LIST = [
  { value: SUPPLIER_TABS.QUOTES, label: 'Cotizaciones' },
  { value: SUPPLIER_TABS.IDENTITY, label: 'Identificación' },
  { value: SUPPLIER_TABS.CONTACT, label: 'Contacto' },
  { value: SUPPLIER_TABS.TERMS, label: 'Condiciones' },
  { value: SUPPLIER_TABS.DECLARATIONS, label: 'Declaraciones' },
]

/**
 * Datos del proveedor que se confirman con una fuente. Sin confirmar van en
 * rojo. `options` = valores cerrados; sin ella, texto libre.
 */
export const FACTS = {
  type: {
    label: 'Tipo',
    options: Object.values(SUPPLIER_TYPE).map((value) => ({
      value,
      label: SUPPLIER_TYPE_LABELS_ES[value],
    })),
  },
  formF: {
    label: 'Formulario F',
    options: [
      { value: 'yes', label: 'Emite' },
      { value: 'no', label: 'No emite' },
    ],
  },
  location: { label: 'Ubicación' },
  port: { label: 'Puerto de embarque' },
  moq: { label: 'MOQ' },
  payment: { label: 'Condiciones de pago' },
  leadTime: { label: 'Plazo de producción' },
  license: { label: 'Licencia comercial' },
}

export const FACT_KEYS = Object.keys(FACTS)

export const IDENTITY_FIELDS = [
  { path: 'alias', label: 'Alias' },
  { path: 'name', label: 'Razón social' },
  { path: 'name_zh', label: 'Nombre en chino' },
]

export const CONTACT_FIELDS = [
  { path: 'contact.person', label: 'Persona' },
  { path: 'contact.phone', label: 'Teléfono' },
  { path: 'contact.whatsapp', label: 'WhatsApp' },
  { path: 'contact.wechat', label: 'WeChat' },
  { path: 'contact.email', label: 'Correo' },
  { path: 'contact.address', label: 'Dirección' },
]

/** Valor de un campo anidado por ruta ('contact.person'). */
export const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj) ?? null

/**
 * Estado de un dato con fuente: `{ value, source, confirmed }`. Confirmado =
 * tiene valor y fuente. El tipo cae a `supplier_type` mientras no se confirme
 * (viene declarado por el proveedor).
 */
export function factOf(supplier, key) {
  const fact = supplier?.facts?.[key]
  if (fact?.value)
    return { value: fact.value, source: fact.source ?? null, confirmed: Boolean(fact.source) }
  if (key === 'type' && supplier?.supplier_type) {
    return {
      value: supplier.supplier_type,
      source: supplier.supplier_type_source ?? null,
      confirmed: false,
    }
  }
  return { value: null, source: null, confirmed: false }
}

/** Texto a mostrar de un dato: la etiqueta de la opción, o el texto tal cual. */
export function factText(key, value) {
  if (value === null) return null
  return FACTS[key].options?.find((o) => o.value === value)?.label ?? value
}
