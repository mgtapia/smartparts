// Rail de navegación — módulos planos (ver .agent/DESIGN.md §Navegación).
// `permission: 'canViewMargin'` restringe la visibilidad — ver docs/SEGURIDAD-Y-ROLES.md.
// `implemented: false` = placeholder sin feature real todavía: AppRail no lo
// muestra (la ruta sigue existiendo, solo no está en la navegación). Distinto
// de un botón deshabilitado dentro de una pantalla real (ver [[WORKFLOW]] —
// esa regla es para acciones dentro de una feature que sí existe; un módulo
// entero sin construir no es una "acción pendiente", es ruido de navegación).

export const RAIL_ITEMS = Object.freeze([
  {
    key: 'dashboard',
    path: '/dashboard',
    labelEs: 'Dashboard',
    icon: 'Dashboard',
    implemented: true,
  },
  {
    key: 'vehicles',
    path: '/vehicles',
    labelEs: 'Vehículos',
    icon: 'DirectionsCar',
    implemented: false,
  },
  {
    key: 'catalog',
    path: '/catalog',
    // La ficha de cada repuesto (/parts/[id]) se abre desde el catálogo: mismo ítem activo.
    alsoActiveOn: ['/parts'],
    labelEs: 'Catálogo',
    icon: 'Category',
    implemented: true,
  },
  {
    key: 'suppliers',
    path: '/suppliers',
    labelEs: 'Proveedores',
    icon: 'Factory',
    implemented: true,
  },
  {
    key: 'quotes',
    path: '/quotes',
    labelEs: 'Cotizaciones',
    icon: 'RequestQuote',
    implemented: true,
  },
  {
    key: 'pending',
    path: '/pending',
    labelEs: 'Pendientes',
    icon: 'Checklist',
    implemented: true,
  },
  { key: 'sourcing', path: '/sourcing', labelEs: 'Sourcing', icon: 'Search', implemented: false },
  { key: 'costing', path: '/costing', labelEs: 'Costeo', icon: 'Calculate', implemented: true },
  {
    key: 'shipments',
    path: '/shipments',
    labelEs: 'Embarques',
    icon: 'LocalShipping',
    implemented: false,
  },
  { key: 'clients', path: '/clients', labelEs: 'Clientes', icon: 'Group', implemented: false },
  {
    key: 'pricing',
    path: '/pricing',
    labelEs: 'Precios',
    icon: 'Sell',
    permission: 'canViewMargin',
    implemented: false,
  },
  { key: 'imports', path: '/imports', labelEs: 'Importar', icon: 'UploadFile', implemented: false },
  {
    key: 'settings',
    path: '/settings',
    labelEs: 'Ajustes',
    icon: 'Tune',
    permission: 'admin',
    implemented: false,
  },
])

export const LOGIN_PATH = '/login'
export const DEFAULT_AUTHENTICATED_PATH = '/dashboard'
