// Repository — Fase 2: lee Firestore (ver .agent/ARCHITECTURE.md §4).
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { getDb } from '@libs/firebase/client'

function shapeVehicle(id, raw) {
  return { id, ...raw }
}

export async function listVehicles() {
  const snap = await getDocs(collection(getDb(), 'vehicles'))
  return snap.docs.map((d) => shapeVehicle(d.id, d.data()))
}

export async function getVehicle(id) {
  if (!id) return null
  const snap = await getDoc(doc(getDb(), 'vehicles', id))
  return snap.exists() ? shapeVehicle(snap.id, snap.data()) : null
}
