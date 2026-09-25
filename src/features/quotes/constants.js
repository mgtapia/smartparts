import { SHIPPING_MODES, SHIPPING_MODE_LABELS_ES } from '@constants/enums'

// Columnas de costo, en el orden de la cadena: precio → costo final.
export const COST_COLUMNS = [
  { code: 'origin', label: 'Transporte China' },
  { code: 'originCharges', label: 'Exportación' },
  { code: 'freight', label: 'Flete' },
  { code: 'insurance', label: 'Seguro' },
  { code: 'cif', label: 'CIF' },
  { code: 'duty', label: 'Arancel' },
  { code: 'localCosts', label: 'Gastos Chile' },
  { code: 'bank', label: 'Banco' },
  { code: 'landedNet', label: 'Costo final' },
  { code: 'vat', label: 'IVA' },
]

export { formatDate, formatIsoDate } from '@libs/dates'

export const MODE_OPTIONS = [
  SHIPPING_MODES.SEA_LCL,
  SHIPPING_MODES.SEA_FCL_20,
  SHIPPING_MODES.SEA_FCL_40HQ,
  SHIPPING_MODES.AIR,
].map((m) => ({
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
  'originCharges',
  'bank',
  'category',
  'position',
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
  'Rojo = estimado, sin verificar (moneda sin confirmar, cotizaciones inferidas, tarifas y parámetros supuestos).',
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
  'Todo lo que se suma desde el precio del proveedor hasta el costo final en Chile, en el orden de la cadena. Cada valor muestra su fuente: son referencias públicas o estimaciones, no cotizaciones reales, por eso van en rojo.',
  'Gastos por embarque: se reparten según la parte del embarque típico que ocupa cada pieza. Es lo mismo que un embarque lleno de esa pieza dividido por la cantidad de piezas.',
  'Transporte en China: tarifa por tonelada-km × toneladas cobrables de la pieza (el mayor entre peso y m³) × la distancia de cada proveedor al puerto o aeropuerto, que se edita en su ficha. Así pesa distinto un proveedor cerca del puerto que uno a 1.700 km.',
  'Flete aéreo: el transportista cobra el mayor entre el peso real y el volumétrico (volumen ÷ factor volumétrico). Marítimo LCL: el mayor entre toneladas y m³.',
  "Contenedor completo, FCL 20' o 40' HC: flete y gastos por contenedor, sin consolidación ni desconsolidación. Cada pieza paga la parte del contenedor que ocupa, el mayor entre su volumen y su peso sobre la capacidad útil; un pedido completo paga los contenedores que alcanzan para su volumen y su peso. Conviene en pedidos grandes: en uno chico sale más caro que LCL.",
  'El arancel general (6 %) se aplica si el proveedor no tiene certificado de origen (Formulario F), que se confirma en su ficha. El IVA no se suma al costo final: es crédito fiscal recuperable.',
]

export const SUPPLIER_ASSUMPTIONS_HELP = [
  'El Incoterm supuesto se usa solo en las líneas cuya cotización no indica Incoterm.',
  'La distancia al puerto o aeropuerto define el transporte en China de este proveedor. Se edita en su ficha, igual que el Formulario F.',
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
