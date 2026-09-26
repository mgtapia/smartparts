import { supplierLabel } from '@features/quotes/constants'
import { orderLabel } from '@features/orders/constants'

/** Cantidad máxima de resultados por grupo en el buscador global. */
export const RESULTS_PER_GROUP = 6

export const SEARCH_GROUP = {
  PART: 'Repuestos',
  SUPPLIER: 'Proveedores',
  CLIENT: 'Clientes',
  CLIENT_ORDER: 'OC de clientes',
  PURCHASE_ORDER: 'OC a proveedores',
}

/** Minúsculas y sin tildes, para que "camara" encuentre "Cámara". */
export const normalizeText = (s) =>
  (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Elementos buscables a partir de los datos ya cargados. Cada uno lleva su
 * ruta de ficha; `haystack` concatena los textos por los que se puede buscar.
 * @param {{ parts: any[], suppliers: any[], clients: any[], clientOrderRows: any[], purchaseOrderRows: any[] }} data
 */
export function buildSearchItems({
  parts = [],
  suppliers = [],
  clients = [],
  clientOrderRows = [],
  purchaseOrderRows = [],
}) {
  const items = []
  const add = (group, id, href, label, detail, extra = []) =>
    items.push({
      key: `${group}:${id}`,
      group,
      href,
      label,
      detail,
      haystack: normalizeText([label, detail, ...extra].filter(Boolean).join(' ')),
    })

  parts.forEach((p) =>
    add(SEARCH_GROUP.PART, p.id, `/parts/${p.id}`, p.nameEs, p.code, [p.nameEn, p.nameZh]),
  )
  suppliers.forEach((s) =>
    add(SEARCH_GROUP.SUPPLIER, s.id, `/suppliers/${s.id}`, supplierLabel(s, s.id), null, [s.name]),
  )
  clients.forEach((c) => add(SEARCH_GROUP.CLIENT, c.id, `/clients/${c.id}`, c.name, null))
  clientOrderRows.forEach(({ order, client }) =>
    add(
      SEARCH_GROUP.CLIENT_ORDER,
      order.id,
      `/client-orders/${order.id}`,
      orderLabel(order),
      client?.name ?? null,
    ),
  )
  purchaseOrderRows.forEach(({ order, supplier }) =>
    add(
      SEARCH_GROUP.PURCHASE_ORDER,
      order.id,
      `/purchase-orders/${order.id}`,
      orderLabel(order),
      supplier ? supplierLabel(supplier, order.supplierId) : null,
    ),
  )
  return items
}

/**
 * Elementos que contienen todas las palabras de la consulta, agrupados en el
 * orden de `SEARCH_GROUP` y con un tope por grupo. Consulta vacía → nada.
 */
export function searchItems(items, query) {
  const words = normalizeText(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const counts = new Map()
  const groupOrder = Object.values(SEARCH_GROUP)
  return items
    .filter((item) => words.every((w) => item.haystack.includes(w)))
    .filter((item) => {
      const n = counts.get(item.group) ?? 0
      counts.set(item.group, n + 1)
      return n < RESULTS_PER_GROUP
    })
    .sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group))
}
