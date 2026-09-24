#!/usr/bin/env node
// Agrega, a los repuestos cuyo código se infirió del lado opuesto, las
// cotizaciones del lado complementario: si el proveedor cotizó el DER, el IZQ se
// carga con el mismo precio y la misma cotización de origen, porque es la misma
// pieza en espejo. Son cotizaciones INFERIDAS, no ofertadas: llevan
// `inferred: true`, `inferred_from_quote` y una nota, y la UI las muestra en
// rojo. Solo se copia lo que el proveedor sí cotizó: si el lado complementario no
// tiene cotización, no se agrega nada. Ids deterministas: volver a correr no duplica.
//
// Uso: node scripts/infer-side-quotes.mjs [--apply]   (dry-run por defecto)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '..', '.env.local')
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

const VEHICLE_SHORT_MODEL = 'E70'
const apply = process.argv.includes('--apply')
const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')
const db = getAdminDb()
const { findVehicleId, loadQuotationIndex, upsertLines } = await import('./lib/model.mjs')
const vehicleId = await findVehicleId(db, VEHICLE_SHORT_MODEL)

const partsSnap = await db
  .collection('parts')
  .where('vehicle_ids', 'array-contains', vehicleId)
  .get()
const parts = partsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
const quotesSnap = await db.collectionGroup('lines').get()
const quotes = quotesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

const sideOf = (name) => (/\bDER\b/.test(name) ? 'DER' : /\bIZQ\b/.test(name) ? 'IZQ' : null)
const swapSide = (name) =>
  name
    .replace(/\b(DER|IZQ)\b/, (s) => (s === 'DER' ? 'IZQ' : 'DER'))
    .trim()
    .toLowerCase()
const byName = new Map(parts.map((p) => [p.name_es.trim().toLowerCase(), p]))

// Repuestos con código inferido del lado opuesto.
const targets = parts.filter(
  (p) => p.oem_codes?.[0]?.source === 'inferido_lado_opuesto' && sideOf(p.name_es),
)

const plan = []
for (const target of targets) {
  const sibling = byName.get(swapSide(target.name_es))
  if (!sibling) continue
  for (const q of quotes.filter((x) => x.part_id === sibling.id && !x.inferred)) {
    const { id, ...rest } = q
    plan.push({
      target: target.name_es,
      from: sibling.name_es,
      supplier: q.supplier_id,
      data: {
        ...rest,
        part_id: target.id,
        inferred: true,
        inferred_from_quote: id,
        inferred_note: `Precio inferido: el proveedor cotizó "${sibling.name_es}", la misma pieza del lado opuesto. No cotizó esta.`,
        match_status: 'pending_review',
        captured_at: new Date(),
      },
    })
  }
}

for (const p of plan)
  console.log(`${p.target}  ←  ${p.from}  |  ${p.supplier}  |  ${p.data.part_type}`)
console.log(`\n${plan.length} cotizaciones inferidas para ${targets.length} repuestos.`)

if (!apply) {
  console.log('Dry-run: no se escribió nada. Usar --apply.')
  process.exit(0)
}
const { created, updated } = await upsertLines(
  db,
  await loadQuotationIndex(db),
  plan.map((p) => p.data),
)
console.log(`Aplicado: ${created} líneas creadas, ${updated} actualizadas.`)
