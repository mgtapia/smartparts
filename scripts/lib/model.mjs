// Ayudas de los scripts para el modelo con ids de Firestore (ver docs/MODELO-DE-DATOS.md):
// ningún script fija ids; se busca por campos naturales y Firestore asigna el id.
//
//   quotations/{auto}          supplier_id, source_file
//   quotations/{id}/lines/{auto}   part_id, part_type, supplier_id, source_file, …

/** Proveedor por su alias (campo `alias`); falla si no existe. */
export async function findSupplierId(db, alias) {
  const snap = await db.collection('suppliers').where('alias', '==', alias).limit(1).get()
  if (snap.empty) throw new Error(`No hay un proveedor con alias "${alias}"`)
  return snap.docs[0].id
}

/** Vehículo por su modelo corto (campo `shortModel`); falla si no existe. */
export async function findVehicleId(db, shortModel) {
  const snap = await db.collection('vehicles').where('shortModel', '==', shortModel).limit(1).get()
  if (snap.empty) throw new Error(`No hay un vehículo con modelo "${shortModel}"`)
  return snap.docs[0].id
}

const quotationKey = (supplierId, sourceFile) => `${supplierId}::${sourceFile ?? ''}`
const lineKey = (quotationId, item) =>
  [quotationId, item.part_id, item.part_type, item.supplier_item ?? ''].join('|')

/**
 * Índice de cotizaciones y líneas existentes, para cargar sin duplicar: una línea es
 * la misma si coinciden cotización (proveedor + archivo), repuesto, calidad e ítem
 * del proveedor. Volver a correr un cargador actualiza en vez de duplicar.
 */
export async function loadQuotationIndex(db) {
  const quotations = new Map()
  for (const d of (await db.collection('quotations').get()).docs) {
    const x = d.data()
    quotations.set(quotationKey(x.supplier_id, x.source_file), d.ref)
  }
  const lines = new Map()
  for (const d of (await db.collectionGroup('lines').get()).docs) {
    lines.set(lineKey(d.ref.parent.parent.id, d.data()), d.ref)
  }
  return { quotations, lines }
}

/**
 * Escribe las líneas: crea la cotización si falta y la línea con id automático, o
 * actualiza la existente. `items`: datos de línea con `supplier_id` y `source_file`.
 * @returns {{ created: number, updated: number }}
 */
export async function upsertLines(db, index, items) {
  let created = 0
  let updated = 0
  let batch = db.batch()
  let pending = 0
  const flush = async () => {
    if (pending === 0) return
    await batch.commit()
    batch = db.batch()
    pending = 0
  }
  for (const item of items) {
    const qKey = quotationKey(item.supplier_id, item.source_file)
    let quotationRef = index.quotations.get(qKey)
    if (!quotationRef) {
      quotationRef = db.collection('quotations').doc()
      batch.set(quotationRef, {
        supplier_id: item.supplier_id,
        source_file: item.source_file ?? null,
        created_at: new Date(),
      })
      index.quotations.set(qKey, quotationRef)
      pending++
    }
    const key = lineKey(quotationRef.id, item)
    const existing = index.lines.get(key)
    const ref = existing ?? quotationRef.collection('lines').doc()
    batch.set(ref, item)
    index.lines.set(key, ref)
    if (existing) updated++
    else created++
    pending++
    if (pending >= 400) await flush()
  }
  await flush()
  return { created, updated }
}
