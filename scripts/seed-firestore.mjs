#!/usr/bin/env node
// Seed de Firestore desde los mocks reales de Fase 1 — bootstrap único de
// Fase 2 (ver .agent/ROADMAP.md). Requiere credenciales de Firebase Admin en
// .env.local (FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY, ver
// .env.local.example).
//
// Reglas de dominio respetadas acá (ver docs/MODELO-DE-DATOS.md):
// - `parts/{id}` usa SIEMPRE autoID de Firestore, nunca el código OEM — los
//   mock ids legibles (`part_b004163`) son solo la clave de cruce local del
//   script, no llegan a Firestore.
// - `oem_index/{code}` centinela agrupa por código OEM y marca los duplicados
//   reales de la planilla (mismo código en piezas físicas distintas).
// - Todo importe pasa por `money()` — nunca un float suelto.
//
// Uso:
//   node scripts/seed-firestore.mjs          # aborta si `parts` ya tiene datos
//   node scripts/seed-firestore.mjs --reset  # borra las colecciones sembradas y vuelve a cargar

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FieldValue } from 'firebase-admin/firestore'
import { money, toMicros } from '../src/libs/money.js'
import { VEHICLES } from '../src/mocks/vehicles.js'
import { CATEGORIES } from '../src/mocks/categories.js'
import { PARTS } from '../src/mocks/parts.js'
import { DEFAULT_PARAM_SET, DEFAULT_FX } from '../src/mocks/costParams.js'

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

const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')

const RESET = process.argv.includes('--reset')
// 'suppliers' y 'quotes' NO se siembran ni se borran acá: solo contienen datos
// reales (proveedores y cotizaciones recibidos). Los mocks de src/mocks/ eran
// inventados y no deben volver a la base — ver .agent/STATUS.md.
const SEEDED_COLLECTIONS = [
  'vehicles',
  'categories',
  'parts',
  'part_vehicle',
  'oem_index',
  'cost_param_sets',
  'fx_rates',
]

async function deleteCollection(db, name) {
  const snap = await db.collection(name).get()
  if (snap.empty) return
  const batch = db.batch()
  snap.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
  console.log(`  borrados ${snap.size} documentos de ${name}`)
}

function partVehicleId(mockPart) {
  return `${mockPart.vehicleId}__${mockPart.id}`
}

async function main() {
  const db = getAdminDb()

  const existing = await db.collection('parts').limit(1).get()
  if (!existing.empty && !RESET) {
    console.error(
      '✖ La colección `parts` ya tiene datos. Corré con --reset si querés borrar y volver a sembrar.',
    )
    process.exit(1)
  }

  if (RESET) {
    console.log('Borrando colecciones existentes…')
    for (const name of SEEDED_COLLECTIONS) {
      await deleteCollection(db, name)
    }
  }

  console.log('Sembrando vehicles…')
  for (const v of VEHICLES) {
    const { id, ...rest } = v
    await db
      .collection('vehicles')
      .doc(id)
      .set({ ...rest, created_at: FieldValue.serverTimestamp() })
  }

  console.log('Sembrando categories…')
  for (const c of CATEGORIES) {
    await db.collection('categories').doc(c.path).set(c)
  }

  console.log('Sembrando cost_param_sets…')
  await db.collection('cost_param_sets').doc(DEFAULT_PARAM_SET.id).set(DEFAULT_PARAM_SET)

  console.log('Sembrando fx_rates…')
  await db.collection('fx_rates').doc(DEFAULT_FX.asOf).set(DEFAULT_FX)

  console.log('Sembrando parts + part_vehicle + quotes + oem_index…')

  // Se mintean las referencias antes de escribir nada, para poder cruzar
  // part_id/quote_id reales entre las cuatro colecciones en el mismo pase.
  const partRefs = new Map() // mock part id -> DocumentReference
  PARTS.forEach((p) => partRefs.set(p.id, db.collection('parts').doc()))

  // Sin cotizaciones de ejemplo: los rollups de precio parten vacíos y se
  // recalculan desde cotizaciones reales.
  const validQuotes = []
  const quoteRefs = new Map()

  function rollupFor(mockPartId) {
    const rollup = {
      original: { min_usd_micro: null, quote_id: null },
      alternative: { min_usd_micro: null, quote_id: null },
    }
    validQuotes
      .filter((q) => q.partId === mockPartId)
      .forEach((q) => {
        const bucket = rollup[q.partType]
        if (!bucket) return
        const micros = toMicros(money(Math.round(q.unitPriceUsd * 100), 'USD'))
        if (bucket.min_usd_micro === null || micros < bucket.min_usd_micro) {
          bucket.min_usd_micro = micros
          bucket.quote_id = quoteRefs.get(q.id).id
        }
      })
    return rollup
  }

  const partsBatch = db.batch()
  PARTS.forEach((p) => {
    const ref = partRefs.get(p.id)
    partsBatch.set(ref, {
      name_es: p.nameEs,
      category_path: p.categoryPath,
      vehicle_ids: [p.vehicleId],
      oem_codes: p.oemCode
        ? [{ code: p.oemCode, code_status: p.codeStatus, source: 'client_baseline' }]
        : [],
      code_status: p.codeStatus,
      weight_g: p.weightG,
      volume_cm3: p.volumeCm3,
      baseline_price: money(p.baselinePriceClp, 'CLP'),
      includes_vat: p.includesVat,
      demand_basis: p.demandBasis,
      demand_scale: p.demandScale,
      quantity_estimated: p.quantityEstimated,
      sourcing_strategy: p.sourcingStrategy || null,
      sourcing_note: p.sourcingNote || null,
      quote_rollup: rollupFor(p.id),
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    })
    partsBatch.set(db.collection('part_vehicle').doc(partVehicleId(p)), {
      part_id: ref.id,
      vehicle_id: p.vehicleId,
      position: p.position,
      year_range: null,
      verified_by: null,
      verified_at: null,
    })
  })
  await partsBatch.commit()

  const quotesBatch = db.batch()
  validQuotes.forEach((q) => {
    quotesBatch.set(quoteRefs.get(q.id), {
      part_id: partRefs.get(q.partId).id,
      supplier_id: q.supplierId,
      part_type: q.partType,
      price: money(Math.round(q.unitPriceUsd * 100), q.currency),
      moq: q.moq,
      incoterm: q.incoterm || null,
      source_platform: null,
      captured_at: q.capturedAt,
      valid_until: q.validUntil,
      match_score: q.matchScore,
      match_status: q.matchStatus,
    })
  })
  await quotesBatch.commit()

  const byCode = new Map()
  PARTS.filter((p) => p.oemCode).forEach((p) => {
    if (!byCode.has(p.oemCode)) byCode.set(p.oemCode, [])
    byCode.get(p.oemCode).push(p)
  })
  const oemBatch = db.batch()
  byCode.forEach((group, code) => {
    oemBatch.set(db.collection('oem_index').doc(code), {
      code,
      part_ids: group.map((p) => partRefs.get(p.id).id),
      flagged_duplicate: group.length > 1,
    })
  })
  await oemBatch.commit()

  console.log(`\n✔ Listo. ${PARTS.length} repuestos, ${VEHICLES.length} vehículos.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✖ Seed falló:', err)
    process.exit(1)
  })
