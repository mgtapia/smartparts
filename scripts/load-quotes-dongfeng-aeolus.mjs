#!/usr/bin/env node
// Carga la cotización de "Dongfeng Aeolus Dealer" (archivo "Dong Feng E70 Spare parts 0924.xlsx",
// forward de WhatsApp 2026-09-27, guardado en Drive → Trabajo/Repuestos/Proveedores). Mismo nombre
// de archivo y misma estructura que la cotización ya cargada de Guangzhou Youman (143 repuestos,
// columna F "Precio（USD）"), pero es un contacto y un proveedor distinto — el usuario lo confirmó
// explícitamente como "nuevo" (2026-09-27). Crea el proveedor si no existe (id de Firestore).
//
// Reglas:
//  - Moneda USD: la indica el encabezado del archivo. Incoterm no indicado → null.
//  - Precio con decimales largos (conversión del proveedor): se redondea a centavos, mitad
//    hacia arriba, sobre el texto (sin float), y el valor original queda en `source_raw`.
//  - Calidad: el proveedor mandó el archivo junto con los mensajes "Oem" y "Oem from
//    manufacturer" — la calidad la indicó él, así que cada línea queda OEM y CONFIRMADA con esa
//    conversación como fuente (no estimada por el equipo, a diferencia del cargador de Youman).
//  - Proveedor: el usuario indicó por WhatsApp que es fábrica y que emiten Formulario F
//    (2026-09-27); ambos datos quedan confirmados con esa fuente.
//
// Uso: node scripts/load-quotes-dongfeng-aeolus.mjs <ruta.xlsx> [--apply]   (dry-run por defecto)

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
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

const VEHICLE_SHORT_MODEL = 'E70'
const SOURCE_FILE = 'Dong Feng E70 Spare parts 0924.xlsx (Dongfeng Aeolus Dealer)'
const CAPTURED = '2026-09-27T00:00:00Z'
const WHATSAPP_SOURCE =
  'Forward de WhatsApp (2026-09-27): mensajes "Oem", "Factory", "Oem from manufacturer" junto con el archivo, y "Dongfeng Aeolus Dealer" como identificación del contacto'
const USER_SOURCE =
  'Indicado por el usuario a partir de la conversación de WhatsApp (2026-09-27): "Nuevo, fábrica y dan certificado"'
const SUPPLIER = {
  name: 'Dongfeng Aeolus Dealer',
  alias: 'Dongfeng Aeolus',
  country: 'CN',
  platform: null,
  platform_url: null,
  supplier_type: 'factory',
  supplier_type_source: USER_SOURCE,
  moq: null,
  incoterm: null,
  verified: false,
  scorecard: null,
  is_placeholder: false,
  contact: null,
  source: 'cotizacion_dongfeng_e70_aeolus',
  source_file: `${SOURCE_FILE} (Drive: Trabajo/Repuestos/Proveedores)`,
  notes:
    'Contacto de WhatsApp identificado como "Dongfeng Aeolus Dealer"; el usuario confirmó que es fábrica y que emite Formulario F. Mismo archivo y mismos precios que la cotización de Guangzhou Youman — dos contactos distintos redistribuyendo la misma lista del fabricante; no verificado por otra vía. La cotización no indica Incoterm.',
}
const QUALITY_SOURCE = {
  source: WHATSAPP_SOURCE,
  at: new Date(CAPTURED),
}

/** Decimal en texto → entero en centavos, mitad hacia arriba, sin pasar por float. */
function toCents(raw) {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(String(raw ?? '').trim())
  if (!m) return null
  const frac = (m[2] ?? '').padEnd(3, '0')
  const cents = Number(m[1]) * 100 + Number(frac.slice(0, 2))
  return Number(frac[2]) >= 5 ? cents + 1 : cents
}

function readSheet(xlsxPath) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xlsx-'))
  const zip = path.join(dir, 'f.zip')
  fs.copyFileSync(xlsxPath, zip)
  execFileSync('powershell', [
    '-NoProfile',
    '-Command',
    `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${dir}\\x' -Force`,
  ])
  const strings = [
    ...fs.readFileSync(`${dir}/x/xl/sharedStrings.xml`, 'utf8').matchAll(/<si>([\s\S]*?)<\/si>/g),
  ].map((m) => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''))
  const xml = fs.readFileSync(`${dir}/x/xl/worksheets/sheet1.xml`, 'utf8')
  const rows = []
  for (const r of xml.matchAll(/<row [^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {}
    for (const c of r[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const v = (c[3] || '').match(/<v>([\s\S]*?)<\/v>/)?.[1]
      if (v === undefined) continue
      cells[c[1]] = c[2].includes('t="s"') ? strings[Number(v)] : v
    }
    rows.push({ row: Number(r[1]), cells })
  }
  fs.rmSync(dir, { recursive: true, force: true })
  return rows
}

const [, , xlsxPath, ...flags] = process.argv
if (!xlsxPath) {
  console.error('Uso: node scripts/load-quotes-dongfeng-aeolus.mjs <ruta.xlsx> [--apply]')
  process.exit(1)
}
const apply = flags.includes('--apply')

const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')
const { findVehicleId, loadQuotationIndex, upsertLines } = await import('./lib/model.mjs')

async function findOrCreateSupplier(db) {
  const snap = await db.collection('suppliers').where('alias', '==', SUPPLIER.alias).limit(1).get()
  if (!snap.empty) return { id: snap.docs[0].id, created: false }
  if (!apply) return { id: null, created: true }
  const now = new Date()
  const ref = await db.collection('suppliers').add({
    ...SUPPLIER,
    facts: {
      type: { value: 'factory', source: SUPPLIER.supplier_type_source, at: now },
      formF: { value: 'yes', source: USER_SOURCE, at: now },
    },
    created_at: now,
  })
  return { id: ref.id, created: true }
}

async function main() {
  const db = getAdminDb()
  const vehicleId = await findVehicleId(db, VEHICLE_SHORT_MODEL)
  const supplier = await findOrCreateSupplier(db)
  const partsSnap = await db
    .collection('parts')
    .where('vehicle_ids', 'array-contains', vehicleId)
    .get()
  const partsByName = new Map()
  for (const d of partsSnap.docs) partsByName.set(d.data().name_es.trim().toLowerCase(), d.id)

  const rows = []
  const unmatched = []
  const noPrice = []
  for (const { row, cells } of readSheet(xlsxPath).slice(1)) {
    const name = (cells.A || '').trim()
    if (!name) continue
    const partId = partsByName.get(name.toLowerCase())
    if (!partId) {
      unmatched.push(`fila ${row}: "${name}"`)
      continue
    }
    const amount = toCents(cells.F)
    if (amount === null) {
      noPrice.push(`fila ${row}: "${name}"`)
      continue
    }
    rows.push({ row, name, partId, amount, raw: cells.F, code: (cells.E || '').trim() })
  }

  const lines = rows.map((r) => ({
    part_id: r.partId,
    supplier_id: supplier.id,
    part_type: 'original',
    confirmations: { part_type: QUALITY_SOURCE },
    price: { amount: r.amount, currency: 'USD', scale: 2 },
    currency_status: 'confirmed',
    moq: null,
    incoterm: null,
    source_platform: 'direct',
    source_file: SOURCE_FILE,
    source_raw: { row: r.row, supplier_code: r.code, price: r.raw },
    captured_at: new Date(CAPTURED),
    valid_until: null,
    match_score: null,
    match_status: 'pending_review',
  }))

  console.log(
    `Proveedor ${SUPPLIER.alias}: ${supplier.created ? (apply ? 'creado' : 'se creará') : 'existe'} (${supplier.id ?? '—'})`,
  )
  console.log(`${lines.length} líneas, todas OEM confirmado por el proveedor.`)
  console.log(`  sin match de repuesto: ${unmatched.length}`, unmatched)
  console.log(`  sin precio (omitidas): ${noPrice.length}`, noPrice)
  if (!apply) {
    console.log('Dry-run — nada escrito. Repetir con --apply.')
    return
  }
  const { created, updated } = await upsertLines(db, await loadQuotationIndex(db), lines)
  console.log(`✔ Líneas de cotización: ${created} creadas, ${updated} actualizadas.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✖ Falló:', err.message)
    process.exit(1)
  })
