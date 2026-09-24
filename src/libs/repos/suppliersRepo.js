// Repository — Fase 2: lee Firestore (ver .agent/ARCHITECTURE.md §4).
import { collection, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { getDb } from '@libs/firebase/client'

function shapeSupplier(id, raw) {
  return { id, ...raw }
}

export async function listSuppliers() {
  const snap = await getDocs(collection(getDb(), 'suppliers'))
  return snap.docs.map((d) => shapeSupplier(d.id, d.data()))
}

export async function getSupplier(id) {
  if (!id) return null
  const snap = await getDoc(doc(getDb(), 'suppliers', id))
  return snap.exists() ? shapeSupplier(snap.id, snap.data()) : null
}

/**
 * Dato del proveedor que se confirma con una fuente: `facts.<key>` guarda
 * `{ value, source, at }`. Sin fuente no queda confirmado (la UI no deja
 * guardarlo así). El tipo de proveedor se replica en `supplier_type` porque
 * las listas lo leen de ahí.
 */
export async function updateSupplierFact(supplierId, key, { value, source }) {
  const patch = { [`facts.${key}`]: { value, source, at: serverTimestamp() } }
  if (key === 'type') {
    patch.supplier_type = value
    patch.supplier_type_source = source
  }
  await updateDoc(doc(getDb(), 'suppliers', supplierId), patch)
}

/** Campo simple del proveedor (alias, razón social, contacto…): no lleva confirmación. */
export async function updateSupplierField(supplierId, path, value) {
  await updateDoc(doc(getDb(), 'suppliers', supplierId), { [path]: value?.trim() || null })
}
