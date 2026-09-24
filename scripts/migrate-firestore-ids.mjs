#!/usr/bin/env node
// Migra todos los ids propios a ids automáticos de Firestore y mueve las relaciones
// de contención a subcolecciones (ver docs/MODELO-DE-DATOS.md):
//
//   vehicles/{slug}          → vehicles/{auto}   (+ media/{auto} con la imagen, sourcing_stage)
//   suppliers/{sup_…}        → suppliers/{auto}
//   quotes/{q_…}             → quotations/{auto}/lines/{auto}   (una cotización por proveedor + archivo)
//   part_vehicle/{a__b}      → parts/{id}/applications/{auto}
//   parts/{id}/media/main    → parts/{id}/media/{auto}  (role: 'main')
//   oem_index/{código}       → oem_index/{auto}   (campo code)
//   categories/{ruta}        → categories/{auto}  (campo path; parts.category_id)
//   fx_rates/{fecha}         → fx_rates/{auto}    (campo as_of)
//   cost_param_sets/{seed}   → cost_param_sets/{auto}  (campo version)
//
// Reescribe las referencias (parts.vehicle_ids, parts.category_id, quote_rollup,
// inferred_from_quote). Antes de escribir guarda un respaldo completo en backups/.
// Las colecciones con id propio que se reemplazan en su lugar se borran en el mismo
// paso; `quotes` y `part_vehicle` quedan hasta `--cleanup`.
//
// Uso: node scripts/migrate-firestore-ids.mjs             (dry-run)
//      node scripts/migrate-firestore-ids.mjs --apply
//      node scripts/migrate-firestore-ids.mjs --cleanup   (borra quotes y part_vehicle)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnvLocal() {
  const envPath = path.resolve(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnvLocal()

const apply = process.argv.includes('--apply')
const cleanup = process.argv.includes('--cleanup')
const SOURCING_SLUG = 'dongfeng_e70' // el vehículo de la etapa de sourcing; pasa a `sourcing_stage: true`

const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')
const db = getAdminDb()

/** Escrituras en lotes de 400 (el máximo de Firestore es 500). */
class Writer {
  constructor() {
    this.ops = []
  }
  set(ref, data) {
    this.ops.push({ type: 'set', ref, data })
  }
  update(ref, data) {
    this.ops.push({ type: 'update', ref, data })
  }
  delete(ref) {
    this.ops.push({ type: 'delete', ref })
  }
  async commit() {
    for (let i = 0; i < this.ops.length; i += 400) {
      const batch = db.batch()
      for (const op of this.ops.slice(i, i + 400)) {
        if (op.type === 'set') batch.set(op.ref, op.data)
        if (op.type === 'update') batch.update(op.ref, op.data)
        if (op.type === 'delete') batch.delete(op.ref)
      }
      await batch.commit()
    }
  }
}

async function all(name) {
  const snap = await db.collection(name).get()
  return snap.docs.map((d) => ({ id: d.id, ref: d.ref, data: d.data() }))
}

// ---------------------------------------------------------------- limpieza
if (cleanup) {
  const w = new Writer()
  for (const name of ['quotes', 'part_vehicle']) {
    for (const d of await all(name)) w.delete(d.ref)
  }
  console.log(`Limpieza: ${w.ops.length} documentos de quotes y part_vehicle.`)
  await w.commit()
  console.log('Listo.')
  process.exit(0)
}

// ------------------------------------------------------------------ lectura
const [vehicles, suppliers, quotes, partVehicle, parts, oemIndex, categories, fxRates, paramSets] =
  await Promise.all([
    all('vehicles'),
    all('suppliers'),
    all('quotes'),
    all('part_vehicle'),
    all('parts'),
    all('oem_index'),
    all('categories'),
    all('fx_rates'),
    all('cost_param_sets'),
  ])
const mediaSnap = await db.collectionGroup('media').get()
const partMedia = mediaSnap.docs.filter((d) => d.ref.parent.parent?.parent.id === 'parts')

const quotationsExisting = (await db.collection('quotations').limit(1).get()).size
if (quotationsExisting > 0) {
  console.error('Ya existe la colección quotations: la migración ya se aplicó. Nada que hacer.')
  process.exit(1)
}

// ------------------------------------------------------------------- mapas
const newRef = (col) => db.collection(col).doc()
const vehicleMap = new Map(vehicles.map((v) => [v.id, newRef('vehicles')]))
const supplierMap = new Map(suppliers.map((s) => [s.id, newRef('suppliers')]))
const categoryMap = new Map(categories.map((c) => [c.id, newRef('categories')]))

// Una cotización por proveedor + archivo de origen.
const quotationKey = (q) => `${q.data.supplier_id}::${q.data.source_file ?? ''}`
const quotationMap = new Map()
for (const q of quotes) {
  const key = quotationKey(q)
  if (!quotationMap.has(key)) {
    quotationMap.set(key, {
      ref: newRef('quotations'),
      supplierId: q.data.supplier_id,
      sourceFile: q.data.source_file ?? null,
    })
  }
}
const lineMap = new Map() // id de quote viejo → referencia de la línea nueva
for (const q of quotes) {
  lineMap.set(q.id, quotationMap.get(quotationKey(q)).ref.collection('lines').doc())
}

const mapVehicle = (id) => vehicleMap.get(id)?.id ?? null
const mapSupplier = (id) => supplierMap.get(id)?.id ?? null

// ------------------------------------------------------------ verificaciones previas
const problems = []
for (const q of quotes) {
  if (!supplierMap.has(q.data.supplier_id)) problems.push(`quote ${q.id}: proveedor sin mapa`)
}
for (const p of parts) {
  for (const vid of p.data.vehicle_ids ?? []) {
    if (!vehicleMap.has(vid)) problems.push(`parts/${p.id}: vehículo ${vid} sin mapa`)
  }
}
for (const pv of partVehicle) {
  if (!vehicleMap.has(pv.data.vehicle_id)) problems.push(`part_vehicle ${pv.id}: vehículo sin mapa`)
}
const partIds = new Set(parts.map((p) => p.id))
const orphanBridge = partVehicle.filter((pv) => !partIds.has(pv.data.part_id))

console.log('Plan de migración')
console.log(`  vehicles:        ${vehicles.length}`)
console.log(`  suppliers:       ${suppliers.length}`)
console.log(`  quotations:      ${quotationMap.size}  (desde ${quotes.length} líneas)`)
console.log(
  `  applications:    ${partVehicle.length - orphanBridge.length}  (part_vehicle con repuesto vigente)`,
)
console.log(
  `  part_vehicle huérfanos (su repuesto ya no existe, no se migran): ${orphanBridge.length}`,
)
console.log(`  parts a actualizar: ${parts.length}   media de repuestos: ${partMedia.length}`)
console.log(
  `  oem_index: ${oemIndex.length}   categories: ${categories.length}   fx_rates: ${fxRates.length}   cost_param_sets: ${paramSets.length}`,
)
if (problems.length) {
  console.log('\nProblemas:')
  problems.slice(0, 20).forEach((p) => console.log('  -', p))
  process.exit(1)
}
if (!apply) {
  console.log('\nDry-run: no se escribió nada. Usar --apply.')
  process.exit(0)
}

// ---------------------------------------------------------------- respaldo
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupDir = path.join(ROOT, 'backups', stamp)
fs.mkdirSync(backupDir, { recursive: true })
const dump = (name, list) =>
  fs.writeFileSync(
    path.join(backupDir, `${name}.json`),
    JSON.stringify(
      list.map((d) => ({ id: d.id, data: d.data })),
      null,
      2,
    ),
  )
dump('vehicles', vehicles)
dump('suppliers', suppliers)
dump('quotes', quotes)
dump('part_vehicle', partVehicle)
dump('parts', parts)
dump('oem_index', oemIndex)
dump('categories', categories)
dump('fx_rates', fxRates)
dump('cost_param_sets', paramSets)
fs.writeFileSync(
  path.join(backupDir, 'part_media.json'),
  JSON.stringify(
    partMedia.map((d) => ({ path: d.ref.path, data: d.data() })),
    null,
    2,
  ),
)
console.log(`\nRespaldo en ${path.relative(ROOT, backupDir)}`)

// --------------------------------------------------------------- escritura
const now = new Date()
const w = new Writer()

// vehicles (+ imagen a subcolección)
for (const v of vehicles) {
  const { image, ...rest } = v.data
  const ref = vehicleMap.get(v.id)
  w.set(ref, { ...rest, sourcing_stage: v.id === SOURCING_SLUG })
  if (image?.data_url) {
    w.set(ref.collection('media').doc(), {
      role: 'main',
      data_url: image.data_url,
      source: image.source ?? null,
      updated_at: image.updated_at ?? now,
    })
  }
  w.delete(v.ref)
}

// suppliers
for (const s of suppliers) {
  w.set(supplierMap.get(s.id), s.data)
  w.delete(s.ref)
}

// quotations + lines
for (const { ref, supplierId, sourceFile } of quotationMap.values()) {
  w.set(ref, { supplier_id: mapSupplier(supplierId), source_file: sourceFile, created_at: now })
}
for (const q of quotes) {
  const data = { ...q.data, supplier_id: mapSupplier(q.data.supplier_id) }
  if (data.inferred_from_quote) {
    data.inferred_from_quote = lineMap.get(data.inferred_from_quote)?.id ?? null
  }
  w.set(lineMap.get(q.id), data)
}

// categories
for (const c of categories) {
  w.set(categoryMap.get(c.id), { ...c.data, path: c.data.path ?? c.id })
  w.delete(c.ref)
}

// oem_index, fx_rates, cost_param_sets: el id viejo pasa a ser un campo
for (const o of oemIndex) {
  w.set(newRef('oem_index'), { ...o.data, code: o.data.code ?? o.id })
  w.delete(o.ref)
}
for (const f of fxRates) {
  w.set(newRef('fx_rates'), { ...f.data, as_of: f.data.asOf ?? f.id })
  w.delete(f.ref)
}
for (const c of paramSets) {
  w.set(newRef('cost_param_sets'), { ...c.data, version: c.data.id ?? c.id })
  w.delete(c.ref)
}

// parts: referencias nuevas
for (const p of parts) {
  const patch = {
    vehicle_ids: (p.data.vehicle_ids ?? []).map(mapVehicle),
    updated_at: now,
  }
  const category = categoryMap.get(p.data.category_path)
  if (category) patch.category_id = category.id
  for (const bucket of ['original', 'alternative']) {
    const oldQuoteId = p.data.quote_rollup?.[bucket]?.quote_id
    if (oldQuoteId) patch[`quote_rollup.${bucket}.quote_id`] = lineMap.get(oldQuoteId)?.id ?? null
  }
  w.update(p.ref, patch)
}

// part_vehicle → parts/{id}/applications
for (const pv of partVehicle) {
  if (!partIds.has(pv.data.part_id)) continue
  w.set(db.collection('parts').doc(pv.data.part_id).collection('applications').doc(), {
    ...pv.data,
    vehicle_id: mapVehicle(pv.data.vehicle_id),
  })
}

// media de repuestos: id fijo 'main' → id automático con role
for (const m of partMedia) {
  const partRef = m.ref.parent.parent
  w.set(partRef.collection('media').doc(), { role: 'main', ...m.data() })
  w.delete(m.ref)
}

console.log(`Escribiendo ${w.ops.length} operaciones…`)
await w.commit()

// ------------------------------------------------------------ verificación
const after = {
  vehicles: (await db.collection('vehicles').count().get()).data().count,
  suppliers: (await db.collection('suppliers').count().get()).data().count,
  quotations: (await db.collection('quotations').count().get()).data().count,
  lines: (await db.collectionGroup('lines').count().get()).data().count,
  applications: (await db.collectionGroup('applications').count().get()).data().count,
  parts: (await db.collection('parts').count().get()).data().count,
}
console.log('Después:', after)
const ok =
  after.vehicles === vehicles.length &&
  after.suppliers === suppliers.length &&
  after.quotations === quotationMap.size &&
  after.lines === quotes.length &&
  after.applications === partVehicle.length - orphanBridge.length &&
  after.parts === parts.length
console.log(ok ? 'Conteos correctos.' : 'ATENCIÓN: los conteos no coinciden, revisar el respaldo.')
console.log('Falta borrar quotes y part_vehicle: node scripts/migrate-firestore-ids.mjs --cleanup')
