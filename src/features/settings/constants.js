export const SETTINGS_TABS = Object.freeze({ SALES: 'ventas', COSTS: 'costos' })

export const SETTINGS_TAB_LIST = [
  { value: SETTINGS_TABS.SALES, label: 'Márgenes y aranceles' },
  { value: SETTINGS_TABS.COSTS, label: 'Costos de importación' },
]

export const SETTINGS_HELP = [
  'Son los parámetros globales: los usan la Calculadora, el Catálogo, la ficha del repuesto y la Compra de prueba.',
  'Los márgenes se aplican sobre el costo puesto en Chile y pueden ser distintos para avión y barco.',
  'Los cambios se guardan en este navegador al pulsar Aplicar. Todo valor sin verificar va en rojo, con su fuente.',
]
