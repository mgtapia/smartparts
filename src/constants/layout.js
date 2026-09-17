// Constantes de layout — ver .agent/DESIGN.md §Layout de anchos / Espaciado de grids.
// Máx. 2 anchos de contenido: fijo (MAX_WIDTH) y completo. No inventar otros.

export const MAX_WIDTH = 1180
export const RAIL_WIDTH = 68

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
