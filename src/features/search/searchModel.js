import { supplierLabel } from '@features/quotes/constants'
import { matchScore, matchesParsed, normalizeText, parseQuery } from '@libs/textSearch'
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

export { normalizeText }

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
      fields: [label, detail, ...extra],
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
  const parsed = parseQuery(query)
  if (!parsed) return []
  const counts = new Map()
  const groupOrder = Object.values(SEARCH_GROUP)
  return (
    items
      .filter((item) =>
        matchesParsed(parsed, {
          text: item.haystack,
          compact: item.haystack.replace(/[^a-z0-9]/g, ''),
        }),
      )
      // Dentro de cada grupo, primero las mejores coincidencias (código o nombre exacto).
      .map((item) => ({ item, score: matchScore(query, item.fields) }))
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item)
      .filter((item) => {
        const n = counts.get(item.group) ?? 0
        counts.set(item.group, n + 1)
        return n < RESULTS_PER_GROUP
      })
      .sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group))
  )
}
