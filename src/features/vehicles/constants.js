export const VEHICLE_TABS = {
  QUOTES: 'cotizaciones',
  PARTS: 'repuestos',
}

export const TAB_LIST = [
  { value: VEHICLE_TABS.QUOTES, label: 'Cotizaciones' },
  { value: VEHICLE_TABS.PARTS, label: 'Repuestos' },
]

/** Nombre corto para tablas y enlaces: marca y modelo, ej. "Dongfeng E70". */
export const vehicleLabel = (vehicle) =>
  [vehicle?.brand, vehicle?.shortModel ?? vehicle?.model].filter(Boolean).join(' ')
