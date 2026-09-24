#!/usr/bin/env node
// Unifica el código local (Chile) y el de sourcing (China) en un solo código por
// repuesto: es el mismo en ambos países, solo se confirma (ver DESIGN.md y
// MODELO-DE-DATOS.md). Por repuesto:
//   - un solo código, con o sin rol            → se deja tal cual, sin `role`
//   - local y sourcing con el MISMO valor      → una entrada sin `role`, con el
//                                                 estado y la fuente del de sourcing
//   - local y sourcing con valores DISTINTOS   → NO se resuelve: se lista para que
//                                                 alguien decida cuál es
// No toca `code_status` ni `sourcing_note`. Nunca confirma nada por su cuenta.
//
// Uso: node scripts/unify-part-codes.mjs [--apply]   (dry-run por defecto)

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

const apply = process.argv.includes('--apply')
const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')
const db = getAdminDb()

const snap = await db.collection('parts').get()
const unify = []
const conflicts = []
let untouched = 0

for (const d of snap.docs) {
  const raw = d.data()
  const codes = raw.oem_codes ?? []
  const local = codes.find((c) => c.role === 'local')
  const sourcing = codes.find((c) => c.role === 'sourcing')

  if (local && sourcing && local.code !== sourcing.code) {
    conflicts.push({ id: d.id, name: raw.name_es, local: local.code, sourcing: sourcing.code })
    continue
  }
  if (codes.length === 0 || codes.every((c) => !c.role)) {
    untouched++
    continue
  }
  // Un solo código (o dos iguales): queda uno, sin `role`.
  const chosen = sourcing ?? local ?? codes[0]
  const { role, ...rest } = chosen
  void role
  unify.push({ id: d.id, name: raw.name_es, next: [rest] })
}

console.log(`Repuestos: ${snap.size}`)
console.log(`Ya con un solo código sin rol: ${untouched}`)
console.log(`A unificar: ${unify.length}`)
console.log(`En conflicto, requieren decisión manual: ${conflicts.length}`)
for (const c of conflicts) {
  console.log(`  ${c.id}  ${c.name}  local=${c.local}  sourcing=${c.sourcing}`)
}

if (!apply) {
  console.log('\nDry-run: no se escribió nada. Usar --apply para aplicar.')
  process.exit(0)
}

for (let i = 0; i < unify.length; i += 400) {
  const batch = db.batch()
  for (const u of unify.slice(i, i + 400)) {
    batch.update(db.collection('parts').doc(u.id), { oem_codes: u.next })
  }
  await batch.commit()
}
console.log(`Aplicado: ${unify.length} repuestos unificados. Los conflictos quedaron sin tocar.`)
