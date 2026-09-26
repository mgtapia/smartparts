// "Repuesto" no está acá — es la identidad de la fila, siempre visible.
// La descripción en inglés/chino vive en la ficha del repuesto y (a futuro)
// en la descarga de archivos para proveedores — no como columna acá, hacía
// la tabla más angosta o forzaba scroll horizontal para poco beneficio.
export const CATALOG_COLUMNS = [
  { id: 'vehicle', label: 'Vehículo' },
  { id: 'category', label: 'Categoría' },
  { id: 'code', label: 'Código' },
  { id: 'baseline', label: 'Precio REF' },
  { id: 'pvp', label: 'PVP' },
  { id: 'supplier', label: 'Proveedor' },
]

/** Margen sobre el costo puesto en Chile con el que se calcula el PVP (basis points). */
export const PVP_MARGIN_BP = 3000
