// Repository — Fase 2: lee Firestore (ver .agent/ARCHITECTURE.md §4).
// `price` en Firestore es un Money real ({amount, currency, scale}, ver
// docs/MODELO-DE-DATOS.md); `unitPriceUsd` acá es el número plano en dólares
// que ya consumían las pantallas desde Fase 1 — conversión única en el borde
// de lectura, nunca aritmética de dinero con floats (ver CLAUDE.md).
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { getDb } from '@libs/firebase/client'
import { listSuppliers } from './suppliersRepo'

function shapeQuote(id, raw, suppliersById) {
  const scale = raw.price?.scale ?? 2
  return {
    id,
    partId: raw.part_id,
    supplierId: raw.supplier_id,
    supplier: suppliersById.get(raw.supplier_id) || null,
    partType: raw.part_type,
    unitPriceUsd: raw.price.amount / 10 ** scale,
    moq: raw.moq,
    incoterm: raw.incoterm || null,
    capturedAt: raw.captured_at,
    validUntil: raw.valid_until,
    matchScore: raw.match_score,
    matchStatus: raw.match_status,
  }
}

async function suppliersById() {
  const suppliers = await listSuppliers()
  return new Map(suppliers.map((s) => [s.id, s]))
}

export async function listQuotes() {
  const [snap, byId] = await Promise.all([getDocs(collection(getDb(), 'quotes')), suppliersById()])
  return snap.docs.map((d) => shapeQuote(d.id, d.data(), byId))
}

export async function listQuotesByPart(partId) {
  const [snap, byId] = await Promise.all([
    getDocs(query(collection(getDb(), 'quotes'), where('part_id', '==', partId))),
    suppliersById(),
  ])
  return snap.docs.map((d) => shapeQuote(d.id, d.data(), byId))
}

export async function getQuote(id) {
  const [snap, byId] = await Promise.all([getDoc(doc(getDb(), 'quotes', id)), suppliersById()])
  return snap.exists() ? shapeQuote(snap.id, snap.data(), byId) : null
}

export function isQuoteExpiringSoon(quote, withinDays = 7, today = new Date()) {
  const validUntil = new Date(quote.validUntil)
  const diffDays = (validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= withinDays
}
