#!/usr/bin/env node
// Carga pesos y volúmenes investigados en fuentes públicas (fichas de vendedores) para los
// repuestos del vehículo en sourcing. Cada entrada del JSON trae su fuente (URL y fecha) y una
// nota que dice qué pieza se usó como referencia. Quedan como 'seller_listing': referencia, no
// dato confirmado (siguen en rojo hasta que el proveedor lo confirme o se mida).
//
// El repuesto se busca por nombre dentro del vehículo en sourcing, sin ids fijos. Nunca pisa un
// dato 'supplier_confirmed' ni 'measured'.
//
// Uso: node scripts/load-logistics-research.mjs <datos.json> [--apply]   (dry-run por defecto)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq < 0) continue
  let v = t.slice(eq + 1).trim()
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
  process.env[t.slice(0, eq).trim()] ??= v
}
const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')
const { FieldValue } = await import('firebase-admin/firestore')

const [, , dataPath, ...flags] = process.argv
if (!dataPath) {
  console.error('Uso: node scripts/load-logistics-research.mjs <datos.json> [--apply]')
  process.exit(1)
}
const apply = flags.includes('--apply')
const PROTECTED = new Set(['supplier_confirmed', 'measured'])
const entries = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

const db = getAdminDb()
const vehicle = (await db.collection('vehicles').where('sourcing_stage', '==', true).get()).docs[0]
const parts = await db.collection('parts').where('vehicle_ids', 'array-contains', vehicle.id).get()
const byName = new Map(parts.docs.map((d) => [d.data().name_es, d]))

let changed = 0
for (const e of entries) {
  const doc = byName.get(e.name)
  if (!doc) {
    console.log(`SIN REPUESTO  ${e.name}`)
    continue
  }
  const p = doc.data()
  if (PROTECTED.has(p.logistics_status)) {
    console.log(`PROTEGIDO     ${e.name} (${p.logistics_status})`)
    continue
  }
  console.log(
    `${apply ? 'ESCRIBE' : 'CAMBIA '}       ${e.name}: ${p.weight_g} g / ${p.volume_cm3} cm³ → ${e.weight_g} g / ${e.volume_cm3} cm³`,
  )
  changed++
  if (apply)
    await doc.ref.update({
      weight_g: e.weight_g,
      volume_cm3: e.volume_cm3,
      // Medidas del bulto (cm): sirven para saber si la pieza cabe en un avión de pasajeros.
      package_cm: e.package_cm ?? null,
      logistics_status: e.status,
      logistics_source: e.source,
      logistics_note: e.note,
      updated_at: FieldValue.serverTimestamp(),
    })
}
console.log(`\n${changed} repuestos ${apply ? 'actualizados' : 'por actualizar (dry-run)'}.`)
process.exit(0)
