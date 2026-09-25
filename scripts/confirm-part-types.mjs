#!/usr/bin/env node
// Marca la calidad (OEM o AFM) de cada línea de cotización como confirmada: es lo que el
// proveedor indicó en su propia cotización (Original/Alternative, OEM/AFM, original/copy), y
// esa cotización es la fuente. Decisión del usuario, 2026-09-25. Las cotizaciones inferidas
// del lado opuesto NO se confirman: el proveedor no las cotizó. Idempotente: no toca las que
// ya están confirmadas.
//
// Uso: node scripts/confirm-part-types.mjs [--apply]   (dry-run por defecto)

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

const SOURCE = 'Indicado por el proveedor en su cotización'
const apply = process.argv.includes('--apply')
const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')
const db = getAdminDb()

const lines = (await db.collectionGroup('lines').get()).docs
const targets = lines.filter((d) => {
  const x = d.data()
  return !x.inferred && !x.confirmations?.part_type
})
console.log(
  `${lines.length} líneas; ${targets.length} por confirmar; ${lines.filter((d) => d.data().inferred).length} inferidas (no se tocan).`,
)
if (!apply) {
  console.log('Dry-run: no se escribió nada. Usar --apply.')
  process.exit(0)
}
const stamp = { source: SOURCE, at: new Date() }
for (let i = 0; i < targets.length; i += 400) {
  const batch = db.batch()
  for (const d of targets.slice(i, i + 400))
    batch.update(d.ref, { 'confirmations.part_type': stamp })
  await batch.commit()
}
console.log(`Aplicado: ${targets.length} líneas con la calidad confirmada.`)
