// Ajustes globales de costo y venta (márgenes de PVP, aranceles, IVA, seguro, tarifas y gastos).
// Cada guardado es una versión nueva en `global_settings/{id}`, nunca una edición: la vigente es
// la más reciente. Los cambios temporales de los modales no pasan por acá.
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { getDb } from '@libs/firebase/client'
import { invalidateQueries } from '@libs/queryCache'

/** La versión vigente, o `null` si todavía no se guardó ninguna (rigen los valores de referencia). */
export async function getGlobalSettings() {
  const snap = await getDocs(
    query(collection(getDb(), 'global_settings'), orderBy('created_at', 'desc'), limit(1)),
  )
  const raw = snap.docs[0]?.data()
  if (!raw) return null
  return {
    rates: raw.rates ?? {},
    params: {
      vatBp: raw.vat_bp,
      insuranceRateBp: raw.insurance_rate_bp,
      insuranceMarkupBp: raw.insurance_markup_bp,
      seaLclWmKgPerCbm: raw.sea_lcl_wm_kg_per_cbm,
    },
    createdBy: raw.created_by ?? null,
  }
}

/** Guarda una versión nueva. `rates` son los valores editables; `params`, IVA, seguro y peso por m³. */
export async function saveGlobalSettings({ rates, params, createdBy }) {
  await addDoc(collection(getDb(), 'global_settings'), {
    // Sin `undefined`: Firestore no lo acepta.
    rates: JSON.parse(JSON.stringify(rates)),
    vat_bp: params.vatBp,
    insurance_rate_bp: params.insuranceRateBp,
    insurance_markup_bp: params.insuranceMarkupBp,
    sea_lcl_wm_kg_per_cbm: params.seaLclWmKgPerCbm,
    created_by: createdBy ?? null,
    created_at: serverTimestamp(),
  })
  invalidateQueries()
}
