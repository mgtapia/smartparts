#!/usr/bin/env node
// Aplica a Firestore el resultado de scripts/verify-codes-tachka.mjs: los
// códigos encontrados pasan a 'confirmed' (source 'tachka_ru') con link y nombre
// de la ficha en sourcing_note. Los códigos con reservas (--reserve
// código=motivo) quedan 'provisional' con el motivo explícito. Los no
// encontrados no se tocan. Nunca pisa partes editadas a mano
// (source 'manual_verification').
//
// Uso: node scripts/apply-tachka-verification.mjs <vehicleId> <resultado.json> [--reserve 5705001="motivo"]...

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

const args = process.argv.slice(2)
const [vehicleId, resultsPath] = args
if (!vehicleId || !resultsPath) {
  console.error(
    'Uso: node scripts/apply-tachka-verification.mjs <vehicleId> <resultado.json> [--reserve código=motivo]...',
  )
  process.exit(1)
}

const reserves = new Map()
for (let i = 2; i < args.length; i++) {
  if (args[i] !== '--reserve') continue
  const [code, ...reason] = args[++i].split('=')
  reserves.set(code, reason.join('='))
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'))
const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')

const CAVEAT =
  'Es un artículo Dongfeng de catálogo de exportación (Rusia): el proveedor chino doméstico puede no reconocerlo — cotizar por nombre + modelo, o con proveedores que atienden exportación.'

async function main() {
  const db = getAdminDb()
  const snap = await db.collection('parts').where('vehicle_ids', 'array-contains', vehicleId).get()
  const batch = db.batch()
  let confirmed = 0
  let reserved = 0

  for (const doc of snap.docs) {
    const raw = doc.data()
    const code = raw.oem_codes?.[0]?.code
    const hit = code ? results[code] : null
    if (!hit?.found) continue
    if (raw.oem_codes[0].source === 'manual_verification') continue

    const site = hit.site ?? 'tachka.ru'
    const reason = reserves.get(code)
    const status = reason ? 'provisional' : 'confirmed'
    const note = reason
      ? `Existe como artículo Dongfeng en ${site} ("${hit.nameRu}", ${hit.url}) pero con reservas: ${reason}. ${CAVEAT}`
      : `Verificado como artículo Dongfeng en ${site} ("${hit.nameRu}", ${hit.url}) — 2026-09-21. Ajuste al E70 no indicado en la ficha salvo modelos i-pro/Evolute. ${CAVEAT}`

    batch.update(doc.ref, {
      code_status: status,
      oem_codes: [{ code, code_status: status, source: site.replace('.', '_') }],
      sourcing_note: note,
      updated_at: new Date(),
    })
    reason ? reserved++ : confirmed++
  }
  await batch.commit()
  console.log(
    `✔ ${vehicleId}: ${confirmed} repuestos confirmed, ${reserved} provisional con reservas.`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✖ Falló:', err.message)
    process.exit(1)
  })
