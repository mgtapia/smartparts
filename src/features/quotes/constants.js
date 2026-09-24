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
export const DEFAULT_HIDDEN = new Set([
  'category',
  'variant',
  'insurance',
  'cif',
  'localCosts',
  'vat',
])

// Textos de ayuda: se muestran a demanda (InfoNote), no sueltos en la página.
export const MATRIX_HELP = [
  'Una fila por repuesto cotizado y una columna por proveedor. Cada celda es un solo valor: el más barato que ese proveedor ofrece en la calidad elegida.',
  'Cualquier calidad: se muestra el más barato sin importar si es OEM o AFM (la etiqueta indica cuál es). Solo OEM: piezas de fábrica. Solo AFM: sirve para ver si hay alternativa para cada repuesto — la columna Ofertas en rojo indica que no la hay.',
  'Va marcado el proveedor más barato de cada fila. Un asterisco indica que ofrece varias variantes de la pieza y se muestra la más barata.',
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

export const PARAMETERS_HELP = [
  'Flete aéreo: el transportista cobra el mayor entre el peso real y el peso volumétrico (volumen ÷ factor volumétrico, 6000 cm³ por kg es lo estándar; algunos couriers usan 5000). Flete marítimo LCL: el mayor entre las toneladas y los m³.',
  'Estimaciones del equipo, sin verificar: reemplazar por cotizaciones reales de forwarder y del agente de aduanas. Por eso los costos calculados salen en rojo.',
  'El arancel general (6 %) se aplica a los proveedores que no tienen certificado de origen (Formulario F). Los aranceles son fijos y no dependen del proveedor: lo que sí depende es si el proveedor emite el Formulario F, que se marca en "Supuestos". Mientras no esté confirmado, se aplica el general.',
]

export const SUPPLIER_ASSUMPTIONS_HELP = [
  'Estimaciones sin verificar: se confirman con el proveedor y con un forwarder.',
  'El Incoterm supuesto se usa solo en las líneas cuya cotización no indica Incoterm. El costo de origen (EXW → FOB) depende de dónde está el proveedor. Sin Formulario F el arancel es el general; con Formulario F, el arancel con TLC.',
]

// Incoterms que el motor sabe llevar a FOB (ver src/core/costing/unitCost.js) y monedas con que se cotiza.
export const INCOTERM_CHOICES = [
  { value: 'EXW', label: 'EXW' },
  { value: 'FCA', label: 'FCA' },
  { value: 'FOB', label: 'FOB' },
]
export const CURRENCY_CHOICES = [
  { value: 'USD', label: 'USD' },
  { value: 'CNY', label: 'CNY' },
]
