// Repository — Fase 2: lee Firestore (ver .agent/ARCHITECTURE.md §4).
// `price` en Firestore es un Money real ({amount, currency, scale}, ver
// docs/MODELO-DE-DATOS.md); `unitPriceUsd` acá es el número plano en dólares
// que ya consumían las pantallas desde Fase 1 — conversión única en el borde
// de lectura, nunca aritmética de dinero con floats (ver CLAUDE.md).
import {
  collectionGroup,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getDb } from '@libs/firebase/client'
import { invalidateQueries } from '@libs/queryCache'
import { listSuppliers } from './suppliersRepo'

// El precio se guarda siempre en la moneda en que cotizó el proveedor
// (`price.currency`); convertir (a USD/CLP) es un paso de presentación o de
// cálculo, nunca del dato. La moneda es una variable aparte del monto: una
// cotización puede cargarse antes de saber en qué moneda está
// (`currency_status: 'unconfirmed'`, `price.currency: null`). `unitPriceUsd`
// solo tiene valor si la moneda está confirmada y ya es USD — si no, es null
// y ninguna pantalla lo toma por dólares ni lo usa para costear.
// Una cotización es un documento (`quotations/{id}`) y sus líneas están en la
// subcolección `lines`: `quote.id` es el id de la línea y `quote.quotationId` el de su cotización.
function shapeQuote(id, raw, suppliersById, quotationId) {
  const scale = raw.price?.scale ?? 2
  const currency = raw.price?.currency ?? null
  const currencyConfirmed = currency !== null && raw.currency_status !== 'unconfirmed'
  const priceAmount = raw.price.amount / 10 ** scale
  return {
    id,
    quotationId,
    partId: raw.part_id,
    supplierId: raw.supplier_id,
    supplier: suppliersById.get(raw.supplier_id) || null,
    partType: raw.part_type,
    // Money tal como se guardó (entero + moneda + scale); currency puede ser null.
    price: { amount: raw.price.amount, currency, scale },
    priceAmount,
    currency,
    currencyConfirmed,
    unitPriceUsd: currencyConfirmed && currency === 'USD' ? priceAmount : null,
    moq: raw.moq,
    incoterm: raw.incoterm || null,
    incotermPlace: raw.incoterm_place ?? null,
    // Confirmación explícita por dato ({ source, at }): sin ella el dato es del equipo o un supuesto.
    incotermConfirmed: Boolean(raw.confirmations?.incoterm),
    incotermPlaceConfirmed: Boolean(raw.confirmations?.incoterm_place),
    confirmations: raw.confirmations ?? {},
    // Cotización inferida: el proveedor cotizó el lado opuesto de la pieza, no esta.
    inferred: Boolean(raw.inferred),
    inferredNote: raw.inferred_note ?? null,
    // Variante ofrecida cuando el proveedor cotiza algo que no calza 1:1 con
    // la ficha (ej. terminal 12 mm vs 14 mm) — sin confirmar hasta revisión humana.
    variant: raw.variant ?? null,
    supplierItem: raw.supplier_item ?? null,
    sourceFile: raw.source_file ?? null,
    packaging: raw.packaging ?? null,
    shippingIncluded: raw.shipping_included ?? null,
    supplierDeclaration: raw.supplier_declaration ?? null,
    // Tramos por cantidad: [{ minQty, amount }] (mismo scale/moneda que price).
    priceTiers: (raw.price_tiers ?? []).map((t) => ({
      minQty: t.min_qty,
      amount: t.amount / 10 ** scale,
      amountMinor: t.amount, // entero en unidad menor (mismo scale que price)
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

const shapeLine = (d, byId) => shapeQuote(d.id, d.data(), byId, d.ref.parent.parent.id)

export async function listQuotes() {
  const [snap, byId] = await Promise.all([
    getDocs(collectionGroup(getDb(), 'lines')),
    suppliersById(),
  ])
  return snap.docs.map((d) => shapeLine(d, byId))
}

export async function listQuotesByPart(partId) {
  const [snap, byId] = await Promise.all([
    getDocs(query(collectionGroup(getDb(), 'lines'), where('part_id', '==', partId))),
    suppliersById(),
  ])
  return snap.docs.map((d) => shapeLine(d, byId))
}

export function isQuoteExpiringSoon(quote, withinDays = 7, today = new Date()) {
  if (!quote.validUntil) return false
  const validUntil = new Date(quote.validUntil)
  const diffDays = (validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= withinDays
}

/**
 * Confirma (o corrige) datos de una cotización completa: se aplica a todas sus
 * líneas. Cada dato queda con su fuente y fecha en `confirmations`; sin ese
 * registro el dato sigue sin confirmar. `fields` admite `incoterm`,
 * `incotermPlace` y `currency`.
 * @param {Array<{ id: string, quotationId: string }>} quotes  Líneas a actualizar.
 * @param {{ incoterm?: string, incotermPlace?: string, currency?: string }} fields
 * @param {string} source  De dónde sale la confirmación (chat, proforma, correo…).
 */
export async function confirmQuotationFields(quotes, fields, source) {
  const db = getDb()
  const stamp = { source, at: serverTimestamp() }
  const patch = {}
  if (fields.incoterm !== undefined) {
    patch.incoterm = fields.incoterm
    patch['confirmations.incoterm'] = stamp
  }
  if (fields.incotermPlace !== undefined) {
    patch.incoterm_place = fields.incotermPlace
    patch['confirmations.incoterm_place'] = stamp
  }
  if (fields.currency !== undefined) {
    patch['price.currency'] = fields.currency
    patch.currency_status = 'confirmed'
    patch['confirmations.currency'] = stamp
  }
  // Firestore admite 500 escrituras por lote.
  for (let i = 0; i < quotes.length; i += 400) {
    const batch = writeBatch(db)
    for (const q of quotes.slice(i, i + 400)) {
      batch.update(doc(db, 'quotations', q.quotationId, 'lines', q.id), patch)
    }
    await batch.commit()
  }
  invalidateQueries()
}
