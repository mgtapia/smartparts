#!/usr/bin/env node
// Marca la procedencia del peso/volumen de todos los repuestos (ver
// LOGISTICS_STATUS en src/constants/enums.js). Los valores originales salen de
// una heurística por palabra clave en el nombre (src/mocks/parts.js), no de
// mediciones → 'estimated'. Se marcan 'suspect' los que se sabe que están mal
// (copiados de otra pieza). No pisa lo que ya tenga un estado distinto de
// 'estimated' (para no borrar datos confirmados al volver a correrlo).
//
// Uso: node scripts/set-logistics-status.mjs [--apply]   (dry-run por defecto)

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

const SOURCE = 'Heurística por palabra clave en el nombre (src/mocks/parts.js), no una medición'

// Nombres cuyo valor se sabe erróneo: la heurística les copió el de otra pieza.
const SUSPECT = {
  'Reflector Portalón Central': 'Copia el peso/volumen del portalón completo (15 kg / 180 L)',
  'Reflector Portalón DER interno': 'Copia el peso/volumen del portalón completo (15 kg / 180 L)',
  'Reflector Portalón IZQ interno': 'Copia el peso/volumen del portalón completo (15 kg / 180 L)',
  'Soporte caja reductora': 'Copia el peso/volumen de la caja reductora (18 kg / 20 L)',
}

const apply = process.argv.includes('--apply')
const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')

async function main() {
  const db = getAdminDb()
  const snap = await db.collection('parts').get()
  const counts = { estimated: 0, suspect: 0, kept: 0 }
  const batches = []
  let batch = db.batch()
  let n = 0
  for (const doc of snap.docs) {
    const raw = doc.data()
    const current = raw.logistics_status
    if (current && current !== 'estimated') {
      counts.kept++
      continue
    }
    const suspectNote = SUSPECT[raw.name_es]
    const update = suspectNote
      ? { logistics_status: 'suspect', logistics_source: SOURCE, logistics_note: suspectNote }
      : { logistics_status: 'estimated', logistics_source: SOURCE, logistics_note: null }
    counts[update.logistics_status]++
    batch.update(doc.ref, update)
    if (++n % 400 === 0) {
      batches.push(batch)
      batch = db.batch()
    }
  }
  batches.push(batch)
  console.log(counts)
  if (!apply) {
    console.log('Dry-run — nada escrito. Repetir con --apply.')
    return
  }
  for (const b of batches) await b.commit()
  console.log('✔ Escrito.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✖ Falló:', err.message)
    process.exit(1)
  })
