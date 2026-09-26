export const SETTINGS_TABS = Object.freeze({ SALES: 'ventas', COSTS: 'costos' })

export const SETTINGS_TAB_LIST = [
  { value: SETTINGS_TABS.SALES, label: 'Precio de venta y aranceles' },
  { value: SETTINGS_TABS.COSTS, label: 'Costos de importación' },
]

export const SETTINGS_HELP = [
  'Son los parámetros globales: los usan la Calculadora, el Catálogo, la ficha del repuesto y la Compra de prueba.',
  'El precio de venta es el mayor entre lo que paga hoy el cliente menos el ahorro máximo y el costo puesto en Chile con el margen mínimo sobre la venta; el margen mínimo puede ser distinto para avión y barco. También están el dólar, el IVA, el seguro, los aranceles y el formato marítimo (LCL o contenedor) con el que se calcula el PVP por barco.',
  'Aplicar guarda los ajustes en la base y todas las pantallas los usan. Los cambios en los modales de parámetros son temporales: valen solo mientras la pantalla está abierta. Todo valor sin verificar va en rojo, con su fuente.',
]
