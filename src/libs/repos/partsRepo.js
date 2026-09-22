// Repository — Fase 2: lee Firestore (ver .agent/ARCHITECTURE.md §4).
// `computeAnomalies`/`computeSavingsOpportunities` son funciones puras
// (reciben datos, no hacen I/O) a propósito: partsRepo.test.js las prueba
// directo contra los datos reales del cliente inicial sin necesitar Firestore
// — el motor de costos ya sienta el precedente de separar cómputo puro de I/O.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { getDb } from '@libs/firebase/client'
import { getCategory } from '@mocks/categories'
import { getVehicle } from './vehiclesRepo'
import { listQuotes, listQuotesByPart } from './quotesRepo'

/**
 * `oem_codes[]` puede traer dos códigos por repuesto, marcados por `role`:
 * 'local' — el código tal cual lo usa el comprador/importador local (Chile),
 * nunca se pisa. 'sourcing' — el que se verificó como reconocible por
 * proveedores/fábrica (China u otro origen), se actualiza cuando se
 * verifica o se corrige. Docs viejos sin `role` (una sola entrada) se tratan
 * como el código local — es lo que siempre hubo antes de esta distinción.
 */
export function getLocalCode(oemCodes) {
  return oemCodes?.find((c) => c.role === 'local') ?? oemCodes?.[0] ?? null
}

export function getSourcingCode(oemCodes) {
  return oemCodes?.find((c) => c.role === 'sourcing') ?? null
}

function shapeRollupBucket(bucket) {
  if (!bucket || bucket.min_usd_micro === null || bucket.min_usd_micro === undefined) {
    return { minUsd: null, quoteId: null }
  }
  return { minUsd: bucket.min_usd_micro / 1e6, quoteId: bucket.quote_id }
}

function shapePart(id, raw, { vehicle = null, quotes = [], position = null } = {}) {
  if (!raw) return null
  return {
    id,
    nameEs: raw.name_es,
    categoryPath: raw.category_path,
    category: getCategory(raw.category_path),
    vehicleId: raw.vehicle_ids?.[0] ?? null,
    vehicle,
    position,
    // oem_codes[] — nunca un código suelto como identidad, ver docs/MODELO-DE-DATOS.md.
    oemCodes: raw.oem_codes || [],
    localCode: getLocalCode(raw.oem_codes),
    sourcingCode: getSourcingCode(raw.oem_codes),
    codeStatus: raw.code_status,
    weightG: raw.weight_g,
    volumeCm3: raw.volume_cm3,
    baselinePrice: raw.baseline_price,
    includesVat: raw.includes_vat,
    demandBasis: raw.demand_basis,
    demandScale: raw.demand_scale,
    quantityEstimated: raw.quantity_estimated,
    sourcingStrategy: raw.sourcing_strategy || null,
    sourcingNote: raw.sourcing_note || null,
    quoteRollup: {
      original: shapeRollupBucket(raw.quote_rollup?.original),
      alternative: shapeRollupBucket(raw.quote_rollup?.alternative),
    },
    quotes,
  }
}

export async function listParts() {
  const [partsSnap, quotes] = await Promise.all([
    getDocs(collection(getDb(), 'parts')),
    listQuotes(),
  ])

  const vehicleIds = [
    ...new Set(partsSnap.docs.map((d) => d.data().vehicle_ids?.[0]).filter(Boolean)),
  ]
  const vehicles = await Promise.all(vehicleIds.map((id) => getVehicle(id)))
  const vehiclesById = new Map(vehicles.filter(Boolean).map((v) => [v.id, v]))

  const quotesByPart = new Map()
  quotes.forEach((q) => {
    if (!quotesByPart.has(q.partId)) quotesByPart.set(q.partId, [])
    quotesByPart.get(q.partId).push(q)
  })

  return partsSnap.docs.map((d) => {
    const raw = d.data()
    return shapePart(d.id, raw, {
      vehicle: vehiclesById.get(raw.vehicle_ids?.[0]) || null,
      quotes: quotesByPart.get(d.id) || [],
    })
  })
}

export async function getPart(id) {
  const snap = await getDoc(doc(getDb(), 'parts', id))
  if (!snap.exists()) return null
  const raw = snap.data()

  const [vehicle, quotes, bridgeSnap] = await Promise.all([
    getVehicle(raw.vehicle_ids?.[0]),
    listQuotesByPart(id),
    getDocs(query(collection(getDb(), 'part_vehicle'), where('part_id', '==', id))),
  ])

  return shapePart(id, raw, {
    vehicle,
    quotes,
    position: bridgeSnap.docs[0]?.data()?.position ?? null,
  })
}

/**
 * Escritura manual de sourcing — código verificado o rechazado a mano contra
 * una fuente real (no otra IA sin cita), para que la conclusión quede en la
 * ficha del repuesto en vez de perderse en un chat. Nunca pisa el código
 * local (Chile/planilla del cliente) — un proveedor chino que no reconoce un
 * código no significa que el comprador local deje de reconocerlo, así que
 * ambos quedan guardados por separado (`role: 'local'`/`'sourcing'`).
 * `codeStatus`/`sourcing_note` describen la confianza del código de
 * *sourcing* específicamente, no del local (ese siempre es "el que tienen").
 */
export async function updatePartSourcing(
  partId,
  { localCode, sourcingCode, codeStatus, sourcingNote },
) {
  const oemCodes = []
  const trimmedLocal = localCode?.trim()
  if (trimmedLocal) oemCodes.push({ code: trimmedLocal, source: 'client_baseline', role: 'local' })

  const trimmedSourcing = sourcingCode?.trim()
  if (trimmedSourcing) {
    oemCodes.push({
      code: trimmedSourcing,
      code_status: codeStatus,
      source: 'manual_verification',
      role: 'sourcing',
    })
  }

  await updateDoc(doc(getDb(), 'parts', partId), {
    oem_codes: oemCodes,
    code_status: codeStatus,
    sourcing_note: sourcingNote?.trim() || null,
    updated_at: serverTimestamp(),
  })
}

export async function listPartsByVehicle(vehicleId) {
  const parts = await listParts()
  return parts.filter((p) => p.vehicleId === vehicleId)
}

export async function listPartsByCategory(categoryPath) {
  const parts = await listParts()
  return parts.filter(
    (p) => p.categoryPath === categoryPath || p.categoryPath.startsWith(`${categoryPath}__`),
  )
}

/**
 * Ranking de oportunidades de ahorro — (baseline − mejor landed/quote) × cantidad.
 * Usa el mínimo entre cotización alternativa y original disponible; en Fase 1,
 * sin motor de costos conectado a las cotizaciones todavía, compara baseline
 * (CLP) contra la cotización FOB (USD) convertida a CLP — una aproximación
 * declarada, no el landed cost real (eso es la calculadora de costeo).
 */
export function computeSavingsOpportunities(parts, fx = { usdClp: 950 }) {
  return parts
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

export async function listSavingsOpportunities(fx = { usdClp: 950 }) {
  const parts = await listParts()
  return computeSavingsOpportunities(parts, fx)
}

/**
 * Auditoría de anomalías — la primera pantalla de valor del importador
 * (ver docs/PRD.md y .agent/MEMORY.md §Fuente de datos real): reporta,
 * nunca corrige en silencio. `rawParts` son documentos crudos de Firestore
 * (name_es, oem_codes[], code_status, baseline_price), no partes shapeadas.
 */
export function computeAnomalies(rawParts) {
  const anomalies = []

  rawParts
    .filter((p) => p.code_status === 'missing')
    .forEach((p) => {
      anomalies.push({
        type: 'missing_code',
        partIds: [p.id],
        detail: `"${p.name_es}" no tiene código OEM.`,
      })
    })

  // Las anomalías de la planilla original se detectan sobre el código LOCAL
  // (el que trajo el cliente) — un código de sourcing verificado aparte no
  // cambia si la planilla original tenía duplicados o precios en conflicto.
  const byCode = new Map()
  rawParts
    .filter((p) => getLocalCode(p.oem_codes)?.code)
    .forEach((p) => {
      const code = getLocalCode(p.oem_codes).code
      if (!byCode.has(code)) byCode.set(code, [])
      byCode.get(code).push(p)
    })

  byCode.forEach((group, code) => {
    if (group.length < 2) return
    const prices = new Set(group.map((p) => p.baseline_price.amount))
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
          .map((p) => p.name_es)
          .join(', ')}) — probablemente deberían tener códigos propios.`,
      })
    }
  })

  return anomalies
}

export async function listAnomalies() {
  const snap = await getDocs(collection(getDb(), 'parts'))
  const rawParts = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return computeAnomalies(rawParts)
}
