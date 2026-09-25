// Repository de órdenes de compra del cliente a SmartDeal:
// `client_orders/{id}` y sus líneas en `client_orders/{id}/client_order_lines/{id}`.
// La subcolección no se llama `lines` a propósito: `lines` ya es el grupo de
// colecciones de las líneas de cotización (`quotations/{id}/lines`) y las
// lecturas por grupo (`collectionGroup('lines')` en quotesRepo y en los
// scripts) mezclarían las líneas de un pedido con las de una cotización.
//
// Ids: los asigna Firestore. El número de OC del cliente es un campo
// (`number`), la clave natural. El precio de venta es un Money en la moneda de
// la OC (normalmente CLP).
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { getDb } from '@libs/firebase/client'
import { invalidateQueries } from '@libs/queryCache'
import { FULFILLMENT } from '@constants/enums'

export const CLIENT_ORDER_LINES = 'client_order_lines'

/**
 * @typedef {import('@libs/money').Money} Money
 *
 * @typedef {Object} ClientOrderInput
 * @property {string} clientId
 * @property {string|null} number   N.º de OC del cliente.
 * @property {string|null} date     'AAAA-MM-DD'.
 * @property {string} status        Ver CLIENT_ORDER_STATUS.
 * @property {string} currency      'CLP' | 'USD'.
 * @property {string|null} [notes]
 *
 * @typedef {Object} ClientOrderLineInput
 * @property {string} partId
 * @property {number} qty           Entero positivo.
 * @property {Money|null} unitPrice Precio de venta unitario acordado.
 */

const clean = (value) => (typeof value === 'string' ? value.trim() || null : (value ?? null))

const shapeMoney = (raw) =>
  raw && Number.isInteger(raw.amount)
    ? { amount: raw.amount, currency: raw.currency, scale: raw.scale }
    : null

function shapeLine(id, raw) {
  return {
    id,
    partId: raw.part_id,
    qty: raw.qty,
    unitPrice: shapeMoney(raw.unit_price),
    fulfillment: raw.fulfillment ?? FULFILLMENT.PURCHASE,
    createdAt: raw.created_at ?? null,
  }
}

function shapeOrder(id, raw, lines) {
  return {
    id,
    clientId: raw.client_id,
    number: raw.number ?? null,
    date: raw.date ?? null,
    status: raw.status,
    currency: raw.currency,
    notes: raw.notes ?? null,
    createdAt: raw.created_at ?? null,
    lines,
  }
}

/** Todas las OC de clientes con sus líneas (dos lecturas, sin índices compuestos). */
export async function listClientOrders() {
  const db = getDb()
  const [ordersSnap, linesSnap] = await Promise.all([
    getDocs(collection(db, 'client_orders')),
    getDocs(collectionGroup(db, CLIENT_ORDER_LINES)),
  ])
  const linesByOrder = new Map()
  for (const d of linesSnap.docs) {
    const orderId = d.ref.parent.parent.id
    if (!linesByOrder.has(orderId)) linesByOrder.set(orderId, [])
    linesByOrder.get(orderId).push(shapeLine(d.id, d.data()))
  }
  return ordersSnap.docs.map((d) => shapeOrder(d.id, d.data(), linesByOrder.get(d.id) ?? []))
}

function orderDoc(input) {
  return {
    client_id: input.clientId,
    number: clean(input.number),
    date: clean(input.date),
    status: input.status,
    currency: input.currency,
    notes: clean(input.notes),
  }
}

function lineDoc(input) {
  return {
    part_id: input.partId,
    qty: input.qty,
    unit_price: input.unitPrice ?? null,
    // Hoy toda línea se cumple comprando; `stock` queda para cuando haya inventario.
    fulfillment: input.fulfillment ?? FULFILLMENT.PURCHASE,
  }
}

/**
 * @param {ClientOrderInput} input
 * @returns {Promise<string>} id asignado por Firestore.
 */
export async function createClientOrder(input) {
  const ref = await addDoc(collection(getDb(), 'client_orders'), {
    ...orderDoc(input),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  })
  invalidateQueries()
  return ref.id
}

/**
 * @param {string} orderId
 * @param {ClientOrderInput} input
 */
export async function updateClientOrder(orderId, input) {
  await updateDoc(doc(getDb(), 'client_orders', orderId), {
    ...orderDoc(input),
    updated_at: serverTimestamp(),
  })
  invalidateQueries()
}

/**
 * @param {string} orderId
 * @param {ClientOrderLineInput} input
 */
export async function addClientOrderLine(orderId, input) {
  await addDoc(collection(getDb(), 'client_orders', orderId, CLIENT_ORDER_LINES), {
    ...lineDoc(input),
    created_at: serverTimestamp(),
  })
  invalidateQueries()
}

/**
 * @param {string} orderId
 * @param {string} lineId
 * @param {ClientOrderLineInput} input
 */
export async function updateClientOrderLine(orderId, lineId, input) {
  await updateDoc(doc(getDb(), 'client_orders', orderId, CLIENT_ORDER_LINES, lineId), {
    ...lineDoc(input),
    updated_at: serverTimestamp(),
  })
  invalidateQueries()
}

/** Borra una línea. La UI no lo permite si una compra la enlaza (ver ordersModel). */
export async function deleteClientOrderLine(orderId, lineId) {
  await deleteDoc(doc(getDb(), 'client_orders', orderId, CLIENT_ORDER_LINES, lineId))
  invalidateQueries()
}
