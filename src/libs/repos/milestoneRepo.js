// Hito hacia la primera OC: pasos que se registran a mano con su fuente
// (proveedor elegido, OC emitida, factura aceptada). Un solo documento,
// `project/milestone`, con un campo por paso: `{ value, source, at }`.
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDb } from '@libs/firebase/client'
import { invalidateQueries } from '@libs/queryCache'

const milestoneRef = () => doc(getDb(), 'project', 'milestone')

export async function getMilestone() {
  const snap = await getDoc(milestoneRef())
  return snap.exists() ? snap.data() : {}
}

/** Registra un paso del hito. Sin fuente no se registra: la UI no lo permite. */
export async function updateMilestoneStep(key, { value, source }) {
  await setDoc(milestoneRef(), { [key]: { value, source, at: serverTimestamp() } }, { merge: true })
  invalidateQueries()
}
