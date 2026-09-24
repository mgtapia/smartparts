// Repository — Fase 2: lee Firestore (ver .agent/ARCHITECTURE.md §4).
// `computeAnomalies`/`computeSavingsOpportunities` son funciones puras
// (reciben datos, no hacen I/O) a propósito: partsRepo.test.js las prueba
// directo contra los datos reales del cliente inicial sin necesitar Firestore
// — el motor de costos ya sienta el precedente de separar cómputo puro de I/O.
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { getDb } from '@libs/firebase/client'
import { invalidateQueries } from '@libs/queryCache'
import { getCategory } from '@mocks/categories'
import { getVehicle, listVehicles } from './vehiclesRepo'
import { listQuotes, listQuotesByPart } from './quotesRepo'

/**
 * Un repuesto tiene un solo código, el mismo en Chile y en China: solo se
 * confirma (`code_status` y `code_source`). `oem_codes[0]` es ese código.
 */
export function getCode(oemCodes) {
  return oemCodes?.[0] ?? null
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
    // Traducciones directas del nombre en español, para comunicarse con
    // proveedores — no son terminología oficial del fabricante verificada.
    nameEn: raw.name_en || null,
    nameZh: raw.name_zh || null,
    categoryPath: raw.category_path,
    category: getCategory(raw.category_path),
    vehicleId: raw.vehicle_ids?.[0] ?? null,
    vehicle,
    position,
    // oem_codes[] — nunca un código suelto como identidad, ver docs/MODELO-DE-DATOS.md.
    oemCodes: raw.oem_codes || [],
    code: getCode(raw.oem_codes)?.code ?? null,
    codeSource: raw.code_source ?? null,
    codeStatus: raw.code_status,
    hsCode: raw.hs_code ?? null,
    hsCodeSource: raw.hs_code_source ?? null,
    dgProfile: raw.dg_profile ?? null,
    weightG: raw.weight_g,
    volumeCm3: raw.volume_cm3,
    // Procedencia del peso/volumen; sin dato → estimado (heurística original).
    logisticsStatus: raw.logistics_status ?? 'estimated',
    logisticsSource: raw.logistics_source ?? null,
    logisticsNote: raw.logistics_note ?? null,
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

  const vehiclesById = new Map((await listVehicles()).map((v) => [v.id, v]))

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
    getDocs(collection(getDb(), 'parts', id, 'applications')),
  ])

  return shapePart(id, raw, {
    vehicle,
    quotes,
    position: bridgeSnap.docs[0]?.data()?.position ?? null,
  })
}

/**
 * Confirma o corrige el código único del repuesto (el mismo en Chile y en
 * China). Un código confirmado exige fuente citable: la UI no deja guardarlo
 * sin ella. Reemplaza los dos códigos por rol de versiones anteriores.
 */
export async function updatePartCode(partId, { code, codeStatus, source, note }) {
  const trimmed = code?.trim()
  await updateDoc(doc(getDb(), 'parts', partId), {
    oem_codes: trimmed ? [{ code: trimmed, source: source?.trim() || 'manual_verification' }] : [],
    code_status: trimmed ? codeStatus : 'missing',
    code_source: source?.trim() || null,
    sourcing_note: note?.trim() || null,
    updated_at: serverTimestamp(),
  })
  invalidateQueries()
}

export async function updatePartNames(partId, { nameEn, nameZh }) {
  await updateDoc(doc(getDb(), 'parts', partId), {
    name_en: nameEn?.trim() || null,
    name_zh: nameZh?.trim() || null,
    updated_at: serverTimestamp(),
  })
  invalidateQueries()
}

/** Peso (g) y volumen (cm³) con su estado y la fuente de la medición. */
export async function updatePartLogistics(partId, { weightG, volumeCm3, status, source, note }) {
  await updateDoc(doc(getDb(), 'parts', partId), {
    weight_g: weightG,
    volume_cm3: volumeCm3,
    logistics_status: status,
    logistics_source: source?.trim() || null,
    logistics_note: note?.trim() || null,
    updated_at: serverTimestamp(),
  })
  invalidateQueries()
}

export async function updatePartCustoms(partId, { hsCode, source }) {
  await updateDoc(doc(getDb(), 'parts', partId), {
    hs_code: hsCode?.trim() || null,
    hs_code_source: source?.trim() || null,
    updated_at: serverTimestamp(),
  })
  invalidateQueries()
}

// La imagen va en una subcolección aparte para no engordar cada lectura del
// catálogo (que trae todos los repuestos): solo la ficha la carga.
const mediaCollection = (partId) => collection(getDb(), 'parts', partId, 'media')
const mainImageQuery = (partId) =>
  query(mediaCollection(partId), where('role', '==', 'main'), limit(1))

export async function getPartImage(partId) {
  const doc0 = (await getDocs(mainImageQuery(partId))).docs[0]
  return doc0 ? { dataUrl: doc0.data().data_url, source: doc0.data().source ?? null } : null
}

export async function savePartImage(partId, { dataUrl, source }) {
  const data = {
    role: 'main',
    data_url: dataUrl,
    source: source?.trim() || null,
    updated_at: serverTimestamp(),
  }
  const existing = (await getDocs(mainImageQuery(partId))).docs[0]
  if (existing) await setDoc(existing.ref, data)
  else await addDoc(mediaCollection(partId), data)
  invalidateQueries()
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

  // Duplicados y precios en conflicto de la planilla original, por código.
  const byCode = new Map()
  rawParts
    .filter((p) => getCode(p.oem_codes)?.code)
    .forEach((p) => {
      const code = getCode(p.oem_codes).code
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
