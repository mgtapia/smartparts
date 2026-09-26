// Menú lateral de navegación (ver .agent/DESIGN.md §Navegación).
// `permission: 'canViewMargin'` restringe la visibilidad — ver docs/SEGURIDAD-Y-ROLES.md.
// `implemented: false` = placeholder sin feature real todavía: el menú no lo
// muestra (la ruta sigue existiendo, solo no está en la navegación). Distinto
// de un botón deshabilitado dentro de una pantalla real (ver [[WORKFLOW]] —
// esa regla es para acciones dentro de una feature que sí existe; un módulo
// entero sin construir no es una "acción pendiente", es ruido de navegación).

// Entradas del menú lateral: una ruta directa o un grupo con `children`.
// Un grupo no tiene ruta propia: abre un flyout (rail contraído) o se despliega
// (rail expandido). El orden sigue el flujo de trabajo: datos → abastecimiento → compra.
export const NAV_ENTRIES = Object.freeze([
  {
    key: 'overview',
    path: '/overview',
    labelEs: 'Vista general',
    icon: 'Dashboard',
    implemented: true,
  },
  {
    key: 'catalog-group',
    labelEs: 'Catálogo',
    icon: 'Category',
    children: [
      {
        key: 'catalog',
        path: '/catalog',
        // La ficha de cada repuesto (/parts/[id]) se abre desde el catálogo: mismo ítem activo.
        alsoActiveOn: ['/parts'],
        labelEs: 'Repuestos',
        icon: 'Category',
        implemented: true,
      },
      {
        key: 'vehicles',
        path: '/vehicles',
        labelEs: 'Vehículos',
        icon: 'DirectionsCar',
        implemented: true,
      },
    ],
  },
  {
    key: 'sourcing-group',
    labelEs: 'Abastecimiento',
    icon: 'Factory',
    children: [
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
      {
        key: 'trial',
        path: '/trial',
        labelEs: 'Compra de prueba',
        icon: 'Flight',
        implemented: true,
      },
      {
        key: 'sourcing',
        path: '/sourcing',
        labelEs: 'Sourcing',
        icon: 'Search',
        implemented: false,
      },
    ],
  },
  {
    key: 'purchasing-group',
    labelEs: 'Compras',
    icon: 'ShoppingCart',
    children: [
      {
        key: 'costing',
        path: '/costing',
        labelEs: 'Simulador',
        icon: 'Calculate',
        implemented: true,
      },
      {
        key: 'orders',
        path: '/orders',
        // Las fichas de cada OC (de cliente y a proveedor) se abren desde Órdenes: mismo ítem activo.
        alsoActiveOn: ['/client-orders', '/purchase-orders'],
        labelEs: 'Órdenes de compra',
        icon: 'ReceiptLong',
        implemented: true,
      },
      {
        key: 'clients',
        path: '/clients',
        labelEs: 'Clientes',
        icon: 'Group',
        implemented: true,
      },
      {
        key: 'shipments',
        path: '/shipments',
        labelEs: 'Embarques',
        icon: 'LocalShipping',
        implemented: false,
      },
      {
        key: 'pricing',
        path: '/pricing',
        labelEs: 'Precios',
        icon: 'Sell',
        permission: 'canViewMargin',
        implemented: false,
      },
    ],
  },
  {
    key: 'admin-group',
    labelEs: 'Administración',
    icon: 'Tune',
    children: [
      {
        key: 'imports',
        path: '/imports',
        labelEs: 'Importar',
        icon: 'UploadFile',
        implemented: false,
      },
      {
        key: 'settings',
        path: '/settings',
        labelEs: 'Ajustes',
        icon: 'Tune',
        permission: 'admin',
        implemented: false,
      },
    ],
  },
])

/** Entradas visibles: sin ítems no implementados y sin grupos que quedan vacíos. */
export function visibleNavEntries() {
  return NAV_ENTRIES.map((entry) =>
    entry.children ? { ...entry, children: entry.children.filter((c) => c.implemented) } : entry,
  ).filter((entry) => (entry.children ? entry.children.length > 0 : entry.implemented))
}

/** Ruta a la que lleva una entrada del menú: la propia o, en un grupo, la de su primer módulo. */
export const entryPath = (entry) => entry.path ?? entry.children[0].path

/** ¿La ruta actual pertenece a este ítem (o a una ficha que se abre desde él)? */
export function isNavItemActive(item, pathname) {
  return [item.path, ...(item.alsoActiveOn ?? [])].some((p) => pathname?.startsWith(p))
}

/**
 * Migas de pan de una ruta: [grupo, ítem] o [ítem]; null si la ruta no está en el menú.
 * `detail` indica que la ruta es una ficha (no la lista del ítem).
 */
export function findNavTrail(pathname) {
  for (const entry of visibleNavEntries()) {
    const items = entry.children ?? [entry]
    for (const item of items) {
      if (!isNavItemActive(item, pathname)) continue
      return {
        group: entry.children ? entry.labelEs : null,
        siblings: entry.children ?? [],
        item,
        detail: !pathname.startsWith(item.path),
      }
    }
  }
  return null
}

export const LOGIN_PATH = '/login'
export const DEFAULT_AUTHENTICATED_PATH = '/overview'
