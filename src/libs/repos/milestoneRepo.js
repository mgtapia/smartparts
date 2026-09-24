// Hito hacia la primera OC: pasos que se registran a mano con su fuente
// (proveedor elegido, OC emitida, factura aceptada). Un documento por vehículo en
// `milestones/{id}` (`vehicle_id`), con un campo por paso: `{ value, source, at }`.
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { getDb } from '@libs/firebase/client'
import { invalidateQueries } from '@libs/queryCache'

const milestonesQuery = (vehicleId) =>
  query(collection(getDb(), 'milestones'), where('vehicle_id', '==', vehicleId), limit(1))

export async function getMilestone(vehicleId) {
  if (!vehicleId) return {}
  const snap = await getDocs(milestonesQuery(vehicleId))
  return snap.docs[0]?.data() ?? {}
}

/** Registra un paso del hito. Sin fuente no se registra: la UI no lo permite. */
export async function updateMilestoneStep(vehicleId, key, { value, source }) {
  const step = { [key]: { value, source, at: serverTimestamp() } }
  const existing = (await getDocs(milestonesQuery(vehicleId))).docs[0]
  if (existing) {
    await setDoc(doc(getDb(), 'milestones', existing.id), step, { merge: true })
  } else {
    await addDoc(collection(getDb(), 'milestones'), { vehicle_id: vehicleId, ...step })
  }
  invalidateQueries()
}
