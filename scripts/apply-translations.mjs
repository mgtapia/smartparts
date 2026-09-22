#!/usr/bin/env node
// Escribe name_en/name_zh en Firestore a partir de un diccionario JSON
// {name_es: {en, zh}}. Son traducciones directas del nombre en español que ya
// tiene la planilla — no un dato externo verificado contra un catálogo (a
// diferencia de oem_codes[], que sí requiere fuente citable, ver
// .agent/MEMORY.md). Sirven para comunicarse con proveedores, no como
// afirmación de terminología oficial del fabricante.
//
// Uso: node scripts/apply-translations.mjs <vehicleId> <diccionario.json>

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

const [, , vehicleId, dictPath] = process.argv
if (!vehicleId || !dictPath) {
  console.error('Uso: node scripts/apply-translations.mjs <vehicleId> <diccionario.json>')
  process.exit(1)
}

const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'))
const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')

async function main() {
  const db = getAdminDb()
  const snap = await db.collection('parts').where('vehicle_ids', 'array-contains', vehicleId).get()

  let updated = 0
  let missing = 0
  const batch = db.batch()

  for (const doc of snap.docs) {
    const raw = doc.data()
    const entry = dict[raw.name_es]
    if (!entry) {
      missing++
      console.warn(`  sin traducción: "${raw.name_es}"`)
      continue
    }
    batch.update(doc.ref, { name_en: entry.en, name_zh: entry.zh, updated_at: new Date() })
    updated++
  }
  await batch.commit()
  console.log(
    `✔ ${vehicleId}: ${updated} repuestos con name_en/name_zh, ${missing} sin match en el diccionario.`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✖ Falló:', err.message)
    process.exit(1)
  })
