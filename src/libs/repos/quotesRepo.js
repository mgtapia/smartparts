// Repository — Fase 2: lee Firestore (ver .agent/ARCHITECTURE.md §4).
// `price` en Firestore es un Money real ({amount, currency, scale}, ver
// docs/MODELO-DE-DATOS.md); `unitPriceUsd` acá es el número plano en dólares
// que ya consumían las pantallas desde Fase 1 — conversión única en el borde
// de lectura, nunca aritmética de dinero con floats (ver CLAUDE.md).
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { getDb } from '@libs/firebase/client'
import { listSuppliers } from './suppliersRepo'

// El precio se guarda siempre en la moneda en que cotizó el proveedor
// (`price.currency`); convertir (a USD/CLP) es un paso de presentación o de
// cálculo, nunca del dato. La moneda es una variable aparte del monto: una
// cotización puede cargarse antes de saber en qué moneda está
// (`currency_status: 'unconfirmed'`, `price.currency: null`). `unitPriceUsd`
// solo tiene valor si la moneda está confirmada y ya es USD — si no, es null
// y ninguna pantalla lo toma por dólares ni lo usa para costear.
function shapeQuote(id, raw, suppliersById) {
  const scale = raw.price?.scale ?? 2
  const currency = raw.price?.currency ?? null
  const currencyConfirmed = currency !== null && raw.currency_status !== 'unconfirmed'
  const priceAmount = raw.price.amount / 10 ** scale
  return {
    id,
    partId: raw.part_id,
    supplierId: raw.supplier_id,
    supplier: suppliersById.get(raw.supplier_id) || null,
    partType: raw.part_type,
    priceAmount,
    currency,
    currencyConfirmed,
    unitPriceUsd: currencyConfirmed && currency === 'USD' ? priceAmount : null,
    moq: raw.moq,
    incoterm: raw.incoterm || null,
    incotermPlace: raw.incoterm_place ?? null,
    // Variante ofrecida cuando el proveedor cotiza algo que no calza 1:1 con
    // la ficha (ej. terminal 12 mm vs 14 mm) — sin confirmar hasta revisión humana.
    variant: raw.variant ?? null,
    // Tramos por cantidad: [{ minQty, amount }] (mismo scale/moneda que price).
    priceTiers: (raw.price_tiers ?? []).map((t) => ({
      minQty: t.min_qty,
      amount: t.amount / 10 ** scale,
    })),
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
  if (!quote.validUntil) return false
  const validUntil = new Date(quote.validUntil)
  const diffDays = (validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= withinDays
}
