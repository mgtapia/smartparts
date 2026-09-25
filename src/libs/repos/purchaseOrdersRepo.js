// Repository de órdenes de compra de SmartDeal a proveedores:
// `purchase_orders/{id}` y sus líneas en
// `purchase_orders/{id}/purchase_order_lines/{id}` (no `lines`: ver la nota en
// clientOrdersRepo.js). Cada línea puede enlazarse a una o más líneas de OC de
// clientes con `client_order_links: [{ client_order_id, line_id, qty }]`.
//
// Hoy las OC se crean a mano; `createPurchaseOrder` recibe la orden completa
// con sus líneas para que el simulador de compra, cuando se integre, genere
// las OC desde el reparto entre proveedores con una sola llamada.
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
  addDoc,
} from 'firebase/firestore'
import { getDb } from '@libs/firebase/client'
import { invalidateQueries } from '@libs/queryCache'
import { PURCHASE_ORDER_STATUS } from '@constants/enums'

export const PURCHASE_ORDER_LINES = 'purchase_order_lines'

/**
 * @typedef {import('@libs/money').Money} Money
 *
 * @typedef {Object} ClientOrderLinkInput
 * @property {string} clientOrderId
 * @property {string} lineId        Id de la línea en `client_orders/{clientOrderId}/client_order_lines`.
 * @property {number} qty           Unidades de esta compra asignadas a esa línea.
 *
 * @typedef {Object} PurchaseOrderLineInput
 * @property {string} partId
 * @property {number} qty
 * @property {Money|null} unitPrice          Precio del proveedor, en la moneda de la OC.
 * @property {string|null} [quoteLineId]     Línea de cotización de la que sale el precio.
 * @property {ClientOrderLinkInput[]} [clientOrderLinks]
 *
 * @typedef {Object} PurchaseOrderInput
 * @property {string} supplierId
 * @property {string|null} [quotationId]
 * @property {string|null} [number]
 * @property {string|null} [date]            'AAAA-MM-DD'.
 * @property {string} [status]               Ver PURCHASE_ORDER_STATUS; por defecto borrador.
 * @property {string|null} [incoterm]
 * @property {string|null} [incotermPlace]
 * @property {string} currency               'USD' | 'CNY'.
 * @property {string|null} [notes]
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
    quoteLineId: raw.quote_line_id ?? null,
    clientOrderLinks: (raw.client_order_links ?? []).map((l) => ({
      clientOrderId: l.client_order_id,
      lineId: l.line_id,
      qty: l.qty,
    })),
  }
}

function shapeOrder(id, raw, lines) {
  return {
    id,
    supplierId: raw.supplier_id,
    quotationId: raw.quotation_id ?? null,
    number: raw.number ?? null,
    date: raw.date ?? null,
    status: raw.status,
    incoterm: raw.incoterm ?? null,
    incotermPlace: raw.incoterm_place ?? null,
    currency: raw.currency,
    notes: raw.notes ?? null,
    createdAt: raw.created_at ?? null,
    lines,
  }
}

/** Todas las OC a proveedores con sus líneas (dos lecturas, sin índices compuestos). */
export async function listPurchaseOrders() {
  const db = getDb()
  const [ordersSnap, linesSnap] = await Promise.all([
    getDocs(collection(db, 'purchase_orders')),
    getDocs(collectionGroup(db, PURCHASE_ORDER_LINES)),
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
    supplier_id: input.supplierId,
    quotation_id: input.quotationId ?? null,
    number: clean(input.number),
    date: clean(input.date),
    status: input.status ?? PURCHASE_ORDER_STATUS.DRAFT,
    incoterm: input.incoterm ?? null,
    incoterm_place: clean(input.incotermPlace),
    currency: input.currency,
    notes: clean(input.notes),
  }
}

function lineDoc(input) {
  return {
    part_id: input.partId,
    qty: input.qty,
    unit_price: input.unitPrice ?? null,
    quote_line_id: input.quoteLineId ?? null,
    client_order_links: (input.clientOrderLinks ?? []).map((l) => ({
      client_order_id: l.clientOrderId,
      line_id: l.lineId,
      qty: l.qty,
    })),
  }
}

/**
 * Crea una OC a un proveedor con todas sus líneas en una sola escritura
 * atómica. Pensada para reutilizarse: la pantalla la llama sin líneas y el
 * simulador de compra la llamará con las líneas del reparto y sus enlaces a
 * las OC de clientes.
 *
 * @param {PurchaseOrderInput & { lines?: PurchaseOrderLineInput[] }} input
 * @returns {Promise<string>} id asignado por Firestore.
 */
export async function createPurchaseOrder({ lines = [], ...input }) {
  const db = getDb()
  const orderRef = doc(collection(db, 'purchase_orders'))
  // Firestore admite 500 escrituras por lote: la OC + sus líneas.
  if (lines.length > 499) throw new Error('createPurchaseOrder(): más de 499 líneas')
  const batch = writeBatch(db)
  batch.set(orderRef, {
    ...orderDoc(input),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  })
  for (const line of lines) {
    batch.set(doc(collection(orderRef, PURCHASE_ORDER_LINES)), {
      ...lineDoc(line),
      created_at: serverTimestamp(),
    })
  }
  await batch.commit()
  invalidateQueries()
  return orderRef.id
}

/**
 * Datos de la OC (no sus líneas).
 * @param {string} orderId
 * @param {PurchaseOrderInput} input
 */
export async function updatePurchaseOrder(orderId, input) {
  await updateDoc(doc(getDb(), 'purchase_orders', orderId), {
    ...orderDoc(input),
    updated_at: serverTimestamp(),
  })
  invalidateQueries()
}

/**
 * @param {string} orderId
 * @param {PurchaseOrderLineInput} input
 */
export async function addPurchaseOrderLine(orderId, input) {
  await addDoc(collection(getDb(), 'purchase_orders', orderId, PURCHASE_ORDER_LINES), {
    ...lineDoc(input),
    created_at: serverTimestamp(),
  })
  invalidateQueries()
}

/**
 * @param {string} orderId
 * @param {string} lineId
 * @param {PurchaseOrderLineInput} input
 */
export async function updatePurchaseOrderLine(orderId, lineId, input) {
  await updateDoc(doc(getDb(), 'purchase_orders', orderId, PURCHASE_ORDER_LINES, lineId), {
    ...lineDoc(input),
    updated_at: serverTimestamp(),
  })
  invalidateQueries()
}

export async function deletePurchaseOrderLine(orderId, lineId) {
  await deleteDoc(doc(getDb(), 'purchase_orders', orderId, PURCHASE_ORDER_LINES, lineId))
  invalidateQueries()
}
