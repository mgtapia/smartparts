#!/usr/bin/env node
// Migración: separa cada `oem_codes[0]` de un solo código en dos entradas con
// `role` explícito — 'local' (el que trae la planilla del cliente, nunca se
// pisa) y 'sourcing' (el que se verificó independientemente contra una fuente
// real). Segura de correr más de una vez (idempotente): si un doc ya tiene
// `role` en sus entradas, se lo salta.
//
// No inventa un código de sourcing distinto — hasta ahora nunca encontramos
// un caso donde el código verificado difiera del local, así que la entrada
// 'sourcing' se reconstruye con el mismo valor que ya estaba, solo separando
// el `source`/`code_status` de la verificación del de la planilla original.
//
// Uso: node scripts/split-local-sourcing-codes.mjs <vehicleId>

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

const [, , vehicleId] = process.argv
if (!vehicleId) {
  console.error('Uso: node scripts/split-local-sourcing-codes.mjs <vehicleId>')
  process.exit(1)
}

const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')

async function main() {
  const db = getAdminDb()
  const snap = await db.collection('parts').where('vehicle_ids', 'array-contains', vehicleId).get()

  let migrated = 0
  let skippedAlready = 0
  let skippedNoCode = 0
  const batch = db.batch()

  for (const doc of snap.docs) {
    const raw = doc.data()
    const codes = raw.oem_codes || []
    if (codes.length === 0) {
      skippedNoCode++
      continue
    }
    if (codes.some((c) => c.role)) {
      skippedAlready++
      continue
    }

    const entry = codes[0]
    const wasVerified = entry.source && entry.source !== 'client_baseline'
    const newCodes = [{ code: entry.code, source: 'client_baseline', role: 'local' }]
    if (wasVerified) {
      newCodes.push({
        code: entry.code,
        code_status: entry.code_status,
        source: entry.source,
        role: 'sourcing',
      })
    }

    batch.update(doc.ref, { oem_codes: newCodes, updated_at: new Date() })
    migrated++
  }
  await batch.commit()

  console.log(
    `✔ ${vehicleId}: ${migrated} repuestos migrados a local/sourcing, ` +
      `${skippedAlready} ya tenían role, ${skippedNoCode} sin código (sin tocar).`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✖ Falló:', err.message)
    process.exit(1)
  })
