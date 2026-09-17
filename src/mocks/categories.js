// Taxonomía — nivel 1 es del cliente inicial (Carrocería/Mecánica/Electricidad,
// ver .agent/MEMORY.md), niveles inferiores agregados para el catálogo transversal.
// Materialized path: carroceria__frontal__opticos.

export const CATEGORIES = [
  { path: 'carroceria', labelEs: 'Carrocería', parent: null },
  { path: 'carroceria__frontal', labelEs: 'Frontal', parent: 'carroceria' },
  { path: 'carroceria__frontal__opticos', labelEs: 'Ópticos', parent: 'carroceria__frontal' },
  {
    path: 'carroceria__frontal__parachoques',
    labelEs: 'Parachoques y absorbedores',
    parent: 'carroceria__frontal',
  },
  { path: 'carroceria__puertas', labelEs: 'Puertas', parent: 'carroceria' },
  {
    path: 'carroceria__puertas__estructura',
    labelEs: 'Estructura y bisagras',
    parent: 'carroceria__puertas',
  },
  { path: 'carroceria__puertas__tapices', labelEs: 'Tapices', parent: 'carroceria__puertas' },
  { path: 'carroceria__tapabarros', labelEs: 'Tapabarros', parent: 'carroceria' },

  { path: 'mecanica', labelEs: 'Mecánica', parent: null },
  { path: 'mecanica__suspension', labelEs: 'Suspensión', parent: 'mecanica' },
  { path: 'mecanica__frenos', labelEs: 'Frenos', parent: 'mecanica' },
  { path: 'mecanica__tren_motriz', labelEs: 'Tren motriz', parent: 'mecanica' },

  { path: 'electricidad', labelEs: 'Electricidad', parent: null },
  {
    path: 'electricidad__carga',
    labelEs: 'Sistema de carga (alto voltaje)',
    parent: 'electricidad',
  },
  { path: 'electricidad__senalizacion', labelEs: 'Señalización y alertas', parent: 'electricidad' },
]

export function getCategory(path) {
  return CATEGORIES.find((c) => c.path === path) || null
}

export function getTopLevelCategories() {
  return CATEGORIES.filter((c) => c.parent === null)
}
