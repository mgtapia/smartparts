// Repository de clientes (`clients/{id}`). El id lo asigna Firestore; el RUT es
// un campo. Los clientes los crea el usuario desde la pantalla de Clientes: no
// se siembran.
import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { getDb } from '@libs/firebase/client'
import { invalidateQueries } from '@libs/queryCache'

/**
 * @typedef {Object} ClientInput
 * @property {string} name
 * @property {string} [rut]
 * @property {{ person?: string, email?: string, phone?: string }} [contact]
 * @property {string} [notes]
 */

const clean = (value) => value?.trim() || null

function toDoc(input) {
  return {
    name: clean(input.name),
    rut: clean(input.rut),
    contact: {
      person: clean(input.contact?.person),
      email: clean(input.contact?.email),
      phone: clean(input.contact?.phone),
    },
    notes: clean(input.notes),
  }
}

function shapeClient(id, raw) {
  return {
    id,
    name: raw.name ?? null,
    rut: raw.rut ?? null,
    contact: {
      person: raw.contact?.person ?? null,
      email: raw.contact?.email ?? null,
      phone: raw.contact?.phone ?? null,
    },
    notes: raw.notes ?? null,
    createdAt: raw.created_at ?? null,
  }
}

export async function listClients() {
  const snap = await getDocs(collection(getDb(), 'clients'))
  return snap.docs.map((d) => shapeClient(d.id, d.data()))
}

/**
 * @param {ClientInput} input
 * @returns {Promise<string>} id asignado por Firestore.
 */
export async function createClient(input) {
  const ref = await addDoc(collection(getDb(), 'clients'), {
    ...toDoc(input),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  })
  invalidateQueries()
  return ref.id
}

/**
 * @param {string} clientId
 * @param {ClientInput} input
 */
export async function updateClient(clientId, input) {
  await updateDoc(doc(getDb(), 'clients', clientId), {
    ...toDoc(input),
    updated_at: serverTimestamp(),
  })
  invalidateQueries()
}
