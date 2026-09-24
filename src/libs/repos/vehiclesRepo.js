// Repository — Fase 2: lee Firestore (ver .agent/ARCHITECTURE.md §4).
// La imagen del vehículo vive en su subcolección `media` (documento con `role: 'main'`).
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore'
import { getDb } from '@libs/firebase/client'

function shapeVehicle(id, raw, image) {
  return {
    id,
    ...raw,
    // Vehículo de la etapa actual de sourcing (el Dongfeng E70): el alcance de Pendientes y Vista general.
    sourcingStage: Boolean(raw.sourcing_stage),
    imageUrl: image?.data_url ?? null,
    imageSource: image?.source ?? null,
  }
}

async function mainImage(vehicleId) {
  const snap = await getDocs(
    query(
      collection(getDb(), 'vehicles', vehicleId, 'media'),
      where('role', '==', 'main'),
      limit(1),
    ),
  )
  return snap.docs[0]?.data() ?? null
}

export async function listVehicles() {
  const snap = await getDocs(collection(getDb(), 'vehicles'))
  const images = await Promise.all(snap.docs.map((d) => mainImage(d.id)))
  return snap.docs.map((d, i) => shapeVehicle(d.id, d.data(), images[i]))
}

export async function getVehicle(id) {
  if (!id) return null
  const snap = await getDoc(doc(getDb(), 'vehicles', id))
  return snap.exists() ? shapeVehicle(snap.id, snap.data(), await mainImage(id)) : null
}
