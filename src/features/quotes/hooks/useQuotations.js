import { useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { listParts } from '@libs/repos/partsRepo'
import { getCategory } from '@mocks/categories'
import { CONFIRMED_LOGISTICS_STATUSES } from '@constants/enums'
import { DEFAULT_PARAM_SET, DEFAULT_FX } from '@mocks/costParams'
import { computeUnitCost } from '@core/costing/unitCost'
import { money } from '@libs/money'
import { toUsdMicro } from '@libs/fx'
import { vehicleLabel } from '@features/vehicles/constants'

/** Firestore devuelve Timestamp; los seeds viejos traen texto ISO. */
export function toDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Precio unitario para comparar: si el proveedor ofrece tramos por volumen, el
 * MÁS ALTO (el que paga quien compra pocas unidades). En esta etapa se comparan
 * precios unitarios; cómo baja el precio con la cantidad va en el simulador.
 * Null si la cotización no tiene moneda.
 */
export function unitPriceMoney(quote) {
  if (!quote.currency) return null
  const amounts = [quote.price.amount, ...quote.priceTiers.map((t) => t.amountMinor)]
  return money(Math.max(...amounts), quote.currency)
}

/** Precio unitario del proveedor llevado a USD (micros), sin costos adicionales. Null si no hay moneda. */
export function priceUsdMicro(quote) {
  const unit = unitPriceMoney(quote)
  return unit === null ? null : toUsdMicro(unit, DEFAULT_FX)
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
  // La cotización manda; solo si no trae Incoterm se usa el supuesto del proveedor.
  const incotermAssumed = !quote.incoterm && settings.assumedIncoterm !== 'none'
  return computeUnitCost({
    unitPrice: unitPriceMoney(quote),
    incoterm: quote.incoterm ?? (incotermAssumed ? settings.assumedIncoterm : null),
    incotermAssumed,
    originDistanceKm: settings.originDistanceKm,
    originDistanceConfirmed: settings.originDistanceConfirmed,
    originFallback: settings.originFallback,
    // Formulario F: dato del proveedor que se confirma en su ficha.
    formF: quote.supplier?.facts?.formF?.value ?? 'unknown',
    weightG: part.weightG,
    dgProfile: part.dgProfile ?? undefined,
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
  const { data, loading, error, reload } = useCachedQuery('parts', listParts)
  const parts = useMemo(() => data ?? [], [data])

  const { lines, quotations } = useMemo(() => {
    const flat = []
    for (const part of parts) {
      const top = part.categoryPath.split('__')[0]
      const enriched = { ...part, categoryLabel: getCategory(top)?.labelEs ?? top }
      for (const quote of part.quotes) flat.push({ part: enriched, quote })
    }
    const groups = new Map()
    for (const line of flat) {
      const id = line.quote.quotationId
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
        // Vehículos cuyos repuestos incluye la cotización.
        vehicles: [
          ...new Map(
            g.lines
              .filter((l) => l.part.vehicle)
              .map((l) => [
                l.part.vehicleId,
                { id: l.part.vehicleId, label: vehicleLabel(l.part.vehicle) },
              ]),
          ).values(),
        ],
        partCount: new Set(g.lines.map((l) => l.part.id)).size,
        // Solo cuentan las líneas que el proveedor cotizó: las inferidas ya van en rojo por sí solas.
        partTypeConfirmed: q.filter((x) => !x.inferred).every((x) => x.partTypeConfirmed),
        originalCount: q.filter((x) => x.partType === 'original').length,
        alternativeCount: q.filter((x) => x.partType === 'alternative').length,
        pendingCount: q.filter((x) => x.matchStatus === 'pending_review').length,
        incoterms: [...new Set(q.map((x) => x.incoterm).filter(Boolean))],
        // Lugar nombrado del Incoterm (ej. "Guangzhou" en "EXW Guangzhou").
        incotermPlaces: [...new Set(q.map((x) => x.incotermPlace).filter(Boolean))],
        currencies: [...new Set(q.map((x) => x.currency ?? 'sin definir'))],
        currencyConfirmed: q.every((x) => x.currencyConfirmed),
        incotermConfirmed: q.every((x) => x.incotermConfirmed),
        incotermPlaceConfirmed: q.every((x) => x.incotermPlaceConfirmed),
        capturedAt: dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null,
        validUntil: valid[0] ?? null,
      }
    })
    list.sort((a, b) => (b.capturedAt?.getTime() ?? 0) - (a.capturedAt?.getTime() ?? 0))
    return { lines: flat, quotations: list }
  }, [parts])

  return { lines, quotations, loading, error, reload }
}
