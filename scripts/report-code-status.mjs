#!/usr/bin/env node
// Reporte de solo lectura: cuenta repuestos de un vehículo por code_status y
// por source, para ver el resultado consolidado después de una tanda de
// verificación. No escribe nada.
//
// Uso: node scripts/report-code-status.mjs <vehicleId>

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
  console.error('Uso: node scripts/report-code-status.mjs <vehicleId>')
  process.exit(1)
}

const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')

async function main() {
  const db = getAdminDb()
  const snap = await db.collection('parts').where('vehicle_ids', 'array-contains', vehicleId).get()
  const byStatus = {}
  const bySourcingSource = {}
  snap.docs.forEach((doc) => {
    const raw = doc.data()
    byStatus[raw.code_status] = (byStatus[raw.code_status] || 0) + 1
    const codes = raw.oem_codes || []
    const source = codes.length ? (codes[0].source ?? '(sin fuente)') : '(sin código)'
    bySourcingSource[source] = (bySourcingSource[source] || 0) + 1
  })
  console.log(`${vehicleId}: ${snap.size} repuestos totales`)
  console.log('Por code_status:', byStatus)
  console.log('Código por fuente:', bySourcingSource)
}

main().then(() => process.exit(0))
