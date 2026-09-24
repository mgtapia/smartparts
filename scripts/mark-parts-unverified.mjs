#!/usr/bin/env node
// Marca en bloque los repuestos de un vehículo cuyo código todavía viene tal
// cual de la planilla del cliente (source: 'client_baseline') como
// 'provisional' + nota de sourcing explicando por qué — no borra el código,
// solo dice explícitamente que no fue verificado contra Dongfeng ni un
// proveedor. Ver .agent/MEMORY.md §Fuente de datos real (Dongfeng E70,
// 2026-09-21) y el plan de la sesión.
//
// No toca partes ya editadas a mano (oem_codes[0].source !== 'client_baseline')
// ni las que ya están 'missing' (ya reportan el problema real, no hay nada que
// "degradar").
//
// Uso: node scripts/mark-parts-unverified.mjs <vehicleId>
//   node scripts/mark-parts-unverified.mjs dongfeng_e70

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
  console.error('Uso: node scripts/mark-parts-unverified.mjs <vehicleId>')
  process.exit(1)
}

const SOURCING_NOTE =
  'Código sin verificar contra Dongfeng ni contra un proveedor — viene tal cual de la ' +
  'planilla del cliente inicial (source: client_baseline). Un proveedor en China ya ' +
  'rechazó códigos de este mismo lote ("can\'t find these part numbers in the Dongfeng ' +
  'system", 2026-09-21). Puede ser un SKU real de exportación/aftermarket en vez del ' +
  'número interno de fábrica — ver .agent/MEMORY.md §Fuente de datos real antes de cotizar.'

const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')

async function main() {
  const db = getAdminDb()
  const snap = await db.collection('parts').where('vehicle_ids', 'array-contains', vehicleId).get()

  let updated = 0
  let skippedManual = 0
  let skippedMissing = 0
  const batchSize = 400
  let batch = db.batch()
  let opsInBatch = 0

  for (const doc of snap.docs) {
    const raw = doc.data()
    if (raw.code_status === 'missing') {
      skippedMissing++
      continue
    }
    const codes = raw.oem_codes || []
    const current = codes[0]
    if (current?.source && current.source !== 'client_baseline') {
      skippedManual++
      continue
    }

    // Solo se marca el código del lote; uno ya verificado a mano no se toca (arriba).
    const oemCodes = codes.map((c) => (c === current ? { ...c, code_status: 'provisional' } : c))
    batch.update(doc.ref, {
      code_status: 'provisional',
      oem_codes: oemCodes,
      sourcing_note: SOURCING_NOTE,
      updated_at: new Date(),
    })
    opsInBatch++
    updated++

    if (opsInBatch >= batchSize) {
      await batch.commit()
      batch = db.batch()
      opsInBatch = 0
    }
  }
  if (opsInBatch > 0) await batch.commit()

  console.log(
    `✔ ${vehicleId}: ${updated} repuestos marcados 'provisional' con nota de sourcing. ` +
      `${skippedMissing} ya eran 'missing' (sin tocar), ${skippedManual} ya tenían verificación manual (sin tocar).`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✖ Falló:', err.message)
    process.exit(1)
  })
