// Repository del inventario (`inventory/{id}`): stock en Chile de un repuesto. El id lo asigna
// Firestore; el repuesto va como campo `part_id` (una entrada por repuesto) y se busca por
// consulta. Las cantidades las carga el usuario: no se siembran.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { getDb } from '@libs/firebase/client'
import { invalidateQueries } from '@libs/queryCache'

/**
 * @typedef {Object} InventoryInput
 * @property {string} partId
 * @property {number} quantity  Unidades en stock (entero, no negativo).
 * @property {string} [location]
 * @property {string} [notes]
 */

const clean = (value) => value?.trim() || null

function toDoc(input) {
  if (!Number.isInteger(input.quantity) || input.quantity < 0) {
    throw new Error('inventory: la cantidad debe ser un entero no negativo')
  }
  return {
    part_id: input.partId,
    quantity: input.quantity,
    location: clean(input.location),
    notes: clean(input.notes),
  }
}

function shapeEntry(id, raw) {
  const updated = raw.updated_at?.toDate?.() ?? null
  return {
    id,
    partId: raw.part_id,
    quantity: raw.quantity ?? 0,
    location: raw.location ?? null,
    notes: raw.notes ?? null,
    // 'AAAA-MM-DD' para formatIsoDate.
    updatedAt: updated ? updated.toISOString().slice(0, 10) : null,
  }
}

export async function listInventory() {
  const snap = await getDocs(collection(getDb(), 'inventory'))
  return snap.docs.map((d) => shapeEntry(d.id, d.data()))
}

/**
 * @param {InventoryInput} input
 * @returns {Promise<string>} id asignado por Firestore.
 */
export async function createInventoryEntry(input) {
  const ref = await addDoc(collection(getDb(), 'inventory'), {
    ...toDoc(input),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  })
  invalidateQueries()
  return ref.id
}

/**
 * @param {string} entryId
 * @param {InventoryInput} input
 */
export async function updateInventoryEntry(entryId, input) {
  await updateDoc(doc(getDb(), 'inventory', entryId), {
    ...toDoc(input),
    updated_at: serverTimestamp(),
  })
  invalidateQueries()
}

/** @param {string} entryId */
export async function deleteInventoryEntry(entryId) {
  await deleteDoc(doc(getDb(), 'inventory', entryId))
  invalidateQueries()
}
