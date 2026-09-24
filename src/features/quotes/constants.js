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

// Textos de ayuda: se muestran a demanda (InfoNote), no sueltos en la página.
export const MATRIX_HELP = [
  'Una fila por repuesto y una columna por proveedor. Cada celda muestra lo que ese proveedor ofrece: una línea por calidad (OEM / AFM).',
  'Va marcado el más barato de cada calidad. Un asterisco indica que el proveedor ofrece varias variantes de la pieza y se muestra la más barata.',
  'Precio del proveedor = lo que cotizó, en USD, con su Incoterm (un EXW no incluye lo que falta para llegar a Chile). Costo final = puesto en Chile y sin IVA; es lo que hay que comparar para decidir.',
  'Rojo = estimado, sin verificar (moneda sin confirmar, OEM declarado por el proveedor, tarifas y parámetros supuestos).',
]

export const DETAIL_HELP = [
  'Todos los costos son por unidad. El costo final es el puesto en Chile, sin IVA.',
  'Rojo = estimado, sin verificar. Pasa el mouse sobre un valor para ver por qué.',
  'Las fórmulas de cada costo están al final de la página.',
]

/** Nombre corto para mostrar: el alias si existe; el nombre completo queda como razón social. */
export const supplierLabel = (supplier, fallbackId = '') =>
  supplier?.alias || supplier?.name || fallbackId
