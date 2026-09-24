// Métricas para decidir con quién comprar: función pura, sin React ni Firebase.
// Compara el precio unitario del proveedor en USD (micros, enteros) por repuesto.
// Las cotizaciones inferidas del lado opuesto no son ofertas del proveedor y no
// entran. Diferencias y sobrecostos son enteros en basis points.
import { PART_TYPE } from '@constants/enums'
import { priceUsdMicro } from '@features/quotes/hooks/useQuotations'

export const QUALITY = { ANY: 'any', OEM: PART_TYPE.ORIGINAL, AFM: PART_TYPE.ALTERNATIVE }

const BP = 10000
const TOP_GAPS = 8

const roundDiv = (num, den) => Math.round(num / den)
const overBp = (micro, min) => roundDiv((micro - min) * BP, min)

function median(values) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : roundDiv(sorted[mid - 1] + sorted[mid], 2)
}

/**
 * @param {Object} input
 * @param {string} input.vehicleId
 * @param {any[]} input.parts     Repuestos (con `vehicleId` y `categoryPath`).
 * @param {any[]} input.lines     Líneas `{ part, quote }` con `part.categoryLabel`.
 * @param {string} input.quality  Una de QUALITY.
 * @param {(supplierId: string) => string} input.supplierName
 */
export function buildAnalytics({ vehicleId, parts, lines, quality, supplierName }) {
  const scopeParts = parts.filter((p) => p.vehicleId === vehicleId)
  const real = lines
    .filter((l) => l.part.vehicleId === vehicleId && !l.quote.inferred)
    .map((l) => ({ ...l, micro: priceUsdMicro(l.quote) }))
    .filter((l) => l.micro !== null)

  // Más barato por repuesto y proveedor dentro de la calidad elegida.
  const cheapest = new Map() // partId -> Map(supplierId -> { micro, confirmed })
  for (const l of real) {
    if (quality !== QUALITY.ANY && l.quote.partType !== quality) continue
    const bySupplier = cheapest.get(l.part.id) ?? new Map()
    const current = bySupplier.get(l.quote.supplierId)
    if (!current || l.micro < current.micro) {
      bySupplier.set(l.quote.supplierId, { micro: l.micro, confirmed: l.quote.currencyConfirmed })
    }
    cheapest.set(l.part.id, bySupplier)
  }

  const supplierIds = [...new Set([...cheapest.values()].flatMap((m) => [...m.keys()]))]
  const partById = new Map(scopeParts.map((p) => [p.id, p]))
  const quotedIds = [...cheapest.keys()].filter((id) => partById.has(id))
  const comparableIds = quotedIds.filter((id) => cheapest.get(id).size >= 2)

  // Por proveedor: cobertura, en cuántos comparables es el más barato y sobrecosto medio.
  const stats = new Map(
    supplierIds.map((id) => [id, { id, name: supplierName(id), parts: 0, cheapest: 0, over: [] }]),
  )
  for (const id of quotedIds) {
    for (const supplierId of cheapest.get(id).keys()) stats.get(supplierId).parts += 1
  }
  const gaps = []
  for (const id of comparableIds) {
    const offers = [...cheapest.get(id).entries()].sort((a, b) => a[1].micro - b[1].micro)
    const min = offers[0][1].micro
    const max = offers[offers.length - 1][1].micro
    for (const [supplierId, { micro }] of offers) {
      const s = stats.get(supplierId)
      if (micro === min) s.cheapest += 1
      s.over.push(overBp(micro, min))
    }
    gaps.push({
      part: partById.get(id),
      cheapest: { supplierId: offers[0][0], micro: min },
      dearest: { supplierId: offers[offers.length - 1][0], micro: max },
      spreadBp: overBp(max, min),
    })
  }
  const suppliers = [...stats.values()]
    .map((s) => ({
      id: s.id,
      name: s.name,
      parts: s.parts,
      cheapest: s.cheapest,
      overBp: s.over.length
        ? roundDiv(
            s.over.reduce((a, b) => a + b, 0),
            s.over.length,
          )
        : null,
    }))
    .sort((a, b) => b.parts - a.parts)

  // Calidad: independiente del filtro; qué ofrece cada proveedor y cuánto difiere AFM de OEM.
  const offered = new Map() // supplierId -> { oem:Set, afm:Set }
  const pairs = new Map() // partId::supplierId -> { oem, afm }
  for (const l of real) {
    if (!partById.has(l.part.id)) continue
    const isOem = l.quote.partType === PART_TYPE.ORIGINAL
    const o = offered.get(l.quote.supplierId) ?? { oem: new Set(), afm: new Set() }
    o[isOem ? 'oem' : 'afm'].add(l.part.id)
    offered.set(l.quote.supplierId, o)
    const key = `${l.part.id}::${l.quote.supplierId}`
    const pair = pairs.get(key) ?? {}
    const slot = isOem ? 'oem' : 'afm'
    pair[slot] = Math.min(pair[slot] ?? l.micro, l.micro)
    pairs.set(key, pair)
  }
  const afmDiffs = [...pairs.values()]
    .filter((p) => p.oem != null && p.afm != null)
    .map((p) => roundDiv((p.afm - p.oem) * BP, p.oem))

  const cells = quotedIds.flatMap((id) => [...cheapest.get(id).values()])

  return {
    summary: {
      totalParts: scopeParts.length,
      quotedParts: quotedIds.length,
      comparableParts: comparableIds.length,
      suppliersCount: supplierIds.length,
      medianSpreadBp: median(gaps.map((g) => g.spreadBp)),
      pricesTotal: cells.length,
      pricesUnconfirmedCurrency: cells.filter((c) => !c.confirmed).length,
    },
    suppliers: suppliers.map((s) => ({
      ...s,
      oem: offered.get(s.id)?.oem.size ?? 0,
      afm: offered.get(s.id)?.afm.size ?? 0,
    })),
    afmVsOem: { medianBp: median(afmDiffs), pairs: afmDiffs.length },
    topGaps: gaps.sort((a, b) => b.spreadBp - a.spreadBp).slice(0, TOP_GAPS),
  }
}
