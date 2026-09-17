// Repository — Fase 2: lee Firestore (ver .agent/ARCHITECTURE.md §4).
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
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
