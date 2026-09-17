// Rail de navegación — 13 módulos planos (ver .agent/DESIGN.md §Navegación).
// `permission: 'canViewMargin'` restringe la visibilidad — ver docs/SEGURIDAD-Y-ROLES.md.

export const RAIL_ITEMS = Object.freeze([
  { key: 'dashboard', path: '/dashboard', labelEs: 'Dashboard', icon: 'Dashboard' },
  { key: 'vehicles', path: '/vehicles', labelEs: 'Vehículos', icon: 'DirectionsCar' },
  { key: 'catalog', path: '/catalog', labelEs: 'Catálogo', icon: 'Category' },
  { key: 'parts', path: '/parts', labelEs: 'Repuestos', icon: 'Settings' },
  { key: 'suppliers', path: '/suppliers', labelEs: 'Proveedores', icon: 'Factory' },
  { key: 'quotes', path: '/quotes', labelEs: 'Cotizaciones', icon: 'RequestQuote' },
  { key: 'sourcing', path: '/sourcing', labelEs: 'Sourcing', icon: 'Search' },
  { key: 'costing', path: '/costing', labelEs: 'Costeo', icon: 'Calculate' },
  { key: 'shipments', path: '/shipments', labelEs: 'Embarques', icon: 'LocalShipping' },
  { key: 'clients', path: '/clients', labelEs: 'Clientes', icon: 'Group' },
  {
    key: 'pricing',
    path: '/pricing',
    labelEs: 'Precios',
    icon: 'Sell',
    permission: 'canViewMargin',
  },
  { key: 'imports', path: '/imports', labelEs: 'Importar', icon: 'UploadFile' },
  { key: 'settings', path: '/settings', labelEs: 'Ajustes', icon: 'Tune', permission: 'admin' },
])

export const LOGIN_PATH = '/login'
export const DEFAULT_AUTHENTICATED_PATH = '/dashboard'
