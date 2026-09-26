// Constantes de layout — ver .agent/DESIGN.md §Layout de anchos / Espaciado de grids.
// Máx. 2 anchos de contenido: fijo (MAX_WIDTH) y completo. No inventar otros.

export const MAX_WIDTH = 1180
export const TOOLTIP_MAX_WIDTH = 260 // ancho máximo de un tooltip: por sobre esto el texto pasa a otra línea
export const POPOVER_TEXT_WIDTH = 360 // ancho máximo del texto en un popover informativo
export const RAIL_WIDTH = 68
export const RAIL_WIDTH_EXPANDED = 208
export const IMAGE_PREVIEW_HEIGHT = 240 // alto máximo de la vista previa de una imagen en un modal
export const PART_IMAGE_SIZE = 56 // lado de la miniatura del repuesto en su ficha

export const GRID_GAP = 16
export const SIDEBAR_GAP = 14
export const LIST_GAP = 12

export const SECTION_MARGIN_BOTTOM = 24

// Estas constantes son px literales (documentadas así en .agent/DESIGN.md).
// En `sx` de MUI, props de espaciado (gap/m*/p*) multiplican un número pelado
// ×8 (la escala de theme.spacing) — pasar GRID_GAP directo da 128px, no 16px.
// Usar siempre px(GRID_GAP) en esas props; en width/maxWidth/height no hace
// falta (esas no se escalan).
export function px(value) {
  return `${value}px`
}
export const VEHICLE_IMAGE_WIDTH = 120 // ancho de la imagen del vehículo en su ficha
export const TOPBAR_HEIGHT = 56 // alto de la barra superior
export const SEARCH_MAX_WIDTH = 640 // ancho máximo del buscador global de la barra superior
export const CONTENT_GAP = 12 // separación entre la ventana de contenido y los bordes de la barra y el menú
export const CONTENT_RADIUS = 16 // esquinas redondeadas de la ventana de contenido
