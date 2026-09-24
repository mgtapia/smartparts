import { useEffect, useMemo, useState } from 'react'
import { listParts } from '@libs/repos/partsRepo'
import { getCategory } from '@mocks/categories'
import { CONFIRMED_LOGISTICS_STATUSES } from '@constants/enums'
import { DEFAULT_PARAM_SET, DEFAULT_FX } from '@mocks/costParams'
import { computeUnitCost } from '@core/costing/unitCost'
import { money } from '@libs/money'
import { toUsdMicro } from '@libs/fx'

const NO_FILE = 'sin-archivo'

export function quotationId(supplierId, sourceFile) {
  return encodeURIComponent(`${supplierId}::${sourceFile ?? NO_FILE}`)
}

/** Firestore devuelve Timestamp; los seeds viejos traen texto ISO. */
export function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Precio del proveedor llevado a USD (micros), sin costos adicionales. Null si no hay moneda. */
export function priceUsdMicro(quote) {
  if (!quote.currency) return null
  return toUsdMicro(money(quote.price.amount, quote.currency), DEFAULT_FX)
}

/**
 * Costo unitario de una línea (una cotización de un proveedor para una pieza)
 * con los supuestos vigentes. Un precio sin moneda no se costea.
 */
export function costLine(line, { mode, rates, settingsFor }) {
  const { quote, part } = line
  if (!quote.currency) {
    return { blockers: ['Moneda sin definir'], components: [], landedNetUsdMicro: null }
  }
  const settings = settingsFor(quote.supplierId)
  return computeUnitCost({
    unitPrice: money(quote.price.amount, quote.currency),
    incoterm: quote.incoterm,
    originCostBp: settings.originCostBp,
    formF: settings.formF,
    weightG: part.weightG,
    volumeCm3: part.volumeCm3,
    logisticsConfirmed: CONFIRMED_LOGISTICS_STATUSES.includes(part.logisticsStatus),
    mode,
    assumptions: rates,
    params: DEFAULT_PARAM_SET,
    fx: DEFAULT_FX,
  })
}

/**
 * Carga todas las cotizaciones con su repuesto y las agrupa por cotización
 * (proveedor + archivo/proforma de origen).
 */
export function useQuotationsData() {
  const [parts, setParts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    listParts()
      .then((all) => {
        if (cancelled) return
        setParts(all)
        setLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const { lines, quotations } = useMemo(() => {
    const flat = []
    for (const part of parts) {
      const top = part.categoryPath.split('__')[0]
      const enriched = { ...part, categoryLabel: getCategory(top)?.labelEs ?? top }
      for (const quote of part.quotes) flat.push({ part: enriched, quote })
    }
    const groups = new Map()
    for (const line of flat) {
      const id = quotationId(line.quote.supplierId, line.quote.sourceFile)
      if (!groups.has(id)) {
        groups.set(id, {
          id,
          supplier: line.quote.supplier,
          supplierId: line.quote.supplierId,
          sourceFile: line.quote.sourceFile,
          lines: [],
        })
      }
      groups.get(id).lines.push(line)
    }
    const list = [...groups.values()].map((g) => {
      const q = g.lines.map((l) => l.quote)
      const dates = q.map((x) => toDate(x.capturedAt)).filter(Boolean)
      const valid = q
        .map((x) => x.validUntil)
        .filter(Boolean)
        .sort()
      return {
        ...g,
        lineCount: g.lines.length,
        partCount: new Set(g.lines.map((l) => l.part.id)).size,
        originalCount: q.filter((x) => x.partType === 'original').length,
        alternativeCount: q.filter((x) => x.partType === 'alternative').length,
        pendingCount: q.filter((x) => x.matchStatus === 'pending_review').length,
        incoterms: [
          ...new Set(q.map((x) => [x.incoterm, x.incotermPlace].filter(Boolean).join(' '))),
        ].filter(Boolean),
        currencies: [...new Set(q.map((x) => x.currency ?? 'sin definir'))],
        currencyConfirmed: q.every((x) => x.currencyConfirmed),
        capturedAt: dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null,
        validUntil: valid[0] ?? null,
      }
    })
    list.sort((a, b) => (b.capturedAt?.getTime() ?? 0) - (a.capturedAt?.getTime() ?? 0))
    return { lines: flat, quotations: list }
  }, [parts])

  return { lines, quotations, loading, error }
}
