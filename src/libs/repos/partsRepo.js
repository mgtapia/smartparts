// Repository ligero — Fase 1 lee de src/mocks/ (ver .agent/ARCHITECTURE.md §4).
// Le da a los repuestos la forma real del modelo de datos (docs/MODELO-DE-DATOS.md):
// oem_codes[] en vez de un código suelto, baseline_price como Money, quote_rollup
// precalculado. Fase 2 reemplaza el cuerpo por Firestore sin cambiar estas firmas.
import { PARTS, getPart as getPartMock } from '@mocks/parts'
import { getVehicle } from '@mocks/vehicles'
import { getCategory } from '@mocks/categories'
import { listQuotesByPart } from './quotesRepo'
import { money } from '@libs/money'

function shapePart(p) {
  if (!p) return null
  const quotes = listQuotesByPart(p.id)
  return {
    id: p.id,
    nameEs: p.nameEs,
    categoryPath: p.categoryPath,
    category: getCategory(p.categoryPath),
    vehicleId: p.vehicleId,
    vehicle: getVehicle(p.vehicleId),
    position: p.position,
    // oem_codes[] — nunca un código suelto como identidad, ver docs/MODELO-DE-DATOS.md.
    oemCodes: p.oemCode
      ? [{ code: p.oemCode, codeStatus: p.codeStatus, source: 'client_baseline' }]
      : [],
    codeStatus: p.codeStatus,
    weightG: p.weightG,
    volumeCm3: p.volumeCm3,
    baselinePrice: money(p.baselinePriceClp, 'CLP'),
    includesVat: p.includesVat,
    demandBasis: p.demandBasis,
    demandScale: p.demandScale,
    quantityEstimated: p.quantityEstimated,
    sourcingStrategy: p.sourcingStrategy || null,
    sourcingNote: p.sourcingNote || null,
    quoteRollup: computeQuoteRollup(quotes),
    quotes,
  }
}

function computeQuoteRollup(quotes) {
  const rollup = {
    original: { minUsd: null, quoteId: null },
    alternative: { minUsd: null, quoteId: null },
  }
  quotes.forEach((q) => {
    const bucket = rollup[q.partType]
    if (!bucket) return
    if (bucket.minUsd === null || q.unitPriceUsd < bucket.minUsd) {
      bucket.minUsd = q.unitPriceUsd
      bucket.quoteId = q.id
    }
  })
  return rollup
}

export function listParts() {
  return PARTS.map(shapePart)
}

export function getPart(id) {
  return shapePart(getPartMock(id))
}

export function listPartsByVehicle(vehicleId) {
  return PARTS.filter((p) => p.vehicleId === vehicleId).map(shapePart)
}

export function listPartsByCategory(categoryPath) {
  return PARTS.filter(
    (p) => p.categoryPath === categoryPath || p.categoryPath.startsWith(`${categoryPath}__`),
  ).map(shapePart)
}

/**
 * Ranking de oportunidades de ahorro — (baseline − mejor landed/quote) × cantidad.
 * Usa el mínimo entre cotización alternativa y original disponible; en Fase 1,
 * sin motor de costos conectado a las cotizaciones todavía, compara baseline
 * (CLP) contra la cotización FOB (USD) convertida a CLP — una aproximación
 * declarada, no el landed cost real (eso es la calculadora de costeo).
 */
export function listSavingsOpportunities(fx = { usdClp: 950 }) {
  return listParts()
    .map((p) => {
      const bestUsd = [p.quoteRollup.original.minUsd, p.quoteRollup.alternative.minUsd]
        .filter((v) => v !== null)
        .sort((a, b) => a - b)[0]
      if (bestUsd === undefined) return null
      const bestClp = Math.round(bestUsd * fx.usdClp)
      const savingsPerUnitClp = p.baselinePrice.amount - bestClp
      return {
        part: p,
        bestQuoteClpEstimate: bestClp,
        savingsPerUnitClp,
        savingsTotalClp: savingsPerUnitClp * p.quantityEstimated,
      }
    })
    .filter((row) => row && row.savingsPerUnitClp > 0)
    .sort((a, b) => b.savingsTotalClp - a.savingsTotalClp)
}

/**
 * Auditoría de anomalías — la primera pantalla de valor del importador
 * (ver docs/PRD.md y .agent/MEMORY.md §Fuente de datos real): reporta,
 * nunca corrige en silencio.
 */
export function listAnomalies() {
  const anomalies = []

  PARTS.filter((p) => p.codeStatus === 'missing').forEach((p) => {
    anomalies.push({
      type: 'missing_code',
      partIds: [p.id],
      detail: `"${p.nameEs}" no tiene código OEM.`,
    })
  })

  const byCode = new Map()
  PARTS.filter((p) => p.oemCode).forEach((p) => {
    if (!byCode.has(p.oemCode)) byCode.set(p.oemCode, [])
    byCode.get(p.oemCode).push(p)
  })

  byCode.forEach((group, code) => {
    if (group.length < 2) return
    const prices = new Set(group.map((p) => p.baselinePriceClp))
    if (prices.size > 1) {
      anomalies.push({
        type: 'price_conflict',
        partIds: group.map((p) => p.id),
        detail: `Código ${code} aparece con ${prices.size} precios distintos: ${[...prices]
          .map((p) => `$${p.toLocaleString('es-CL')}`)
          .join(' / ')}.`,
      })
    } else {
      anomalies.push({
        type: 'duplicate_position',
        partIds: group.map((p) => p.id),
        detail: `Código ${code} se repite en ${group.length} piezas distintas (${group
          .map((p) => p.nameEs)
          .join(', ')}) — probablemente deberían tener códigos propios.`,
      })
    }
  })

  return anomalies
}
