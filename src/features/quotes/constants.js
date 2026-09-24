import { SHIPPING_MODES, SHIPPING_MODE_LABELS_ES } from '@constants/enums'

// Columnas de costo, en el orden de la cadena: precio → costo final.
export const COST_COLUMNS = [
  { code: 'origin', label: 'Origen' },
  { code: 'freight', label: 'Flete' },
  { code: 'insurance', label: 'Seguro' },
  { code: 'cif', label: 'CIF' },
  { code: 'duty', label: 'Arancel' },
  { code: 'localCosts', label: 'Gastos locales' },
  { code: 'landedNet', label: 'Costo final' },
  { code: 'vat', label: 'IVA' },
]

export const SUPPLIER_TYPE_LABELS_ES = {
  factory: 'Fábrica',
  distributor: 'Distribuidor',
  dealer: 'Dealer',
}

export const formatDate = (d) => (d ? d.toLocaleDateString('es-CL') : '—')

/** 'AAAA-MM-DD' → 'DD-MM-AAAA' sin pasar por Date (evita el corrimiento por zona horaria). */
export const formatIsoDate = (iso) => iso.split('-').reverse().join('-')

export const MODE_OPTIONS = [SHIPPING_MODES.SEA_LCL, SHIPPING_MODES.AIR].map((m) => ({
  value: m,
  label: SHIPPING_MODE_LABELS_ES[m],
}))

// Columnas que se pueden mostrar u ocultar (la pieza siempre se ve). Por
// defecto solo la información clave para decidir; el resto se activa desde
// "Columnas" — así la tabla nunca pasa del ancho de la pantalla.
export const COLUMN_CHOICES = [
  { id: 'category', label: 'Categoría' },
  { id: 'position', label: 'Lugar' },
  { id: 'code', label: 'Código' },
  { id: 'quality', label: 'Calidad' },
  { id: 'variant', label: 'Variante' },
  { id: 'price', label: 'Precio' },
  ...COST_COLUMNS.map((c) => ({ id: c.code, label: c.label })),
]
export const DEFAULT_HIDDEN = new Set(['category', 'insurance', 'cif', 'localCosts', 'vat'])

/** Qué calidades ofrece una cotización, según lo que cotizó: OEM, AFM o ambas. */
export const sellsLabel = (q) => {
  if (q.originalCount > 0 && q.alternativeCount > 0) return 'OEM + AFM'
  return q.originalCount > 0 ? 'OEM' : 'AFM'
}
