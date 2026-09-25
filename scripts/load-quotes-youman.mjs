#!/usr/bin/env node
// Carga la cotización de Guangzhou Youman International Automobile Trading Co., Ltd.
// (archivo "Dong Feng E70 Spare parts 0924.xlsx", WhatsApp 2026-09-25, guardado en Drive →
// Trabajo/Repuestos/Proveedores). Es nuestra planilla de 143 repuestos con la columna F
// "Precio（USD）" llena por el proveedor. Crea el proveedor si no existe (id de Firestore).
//
// Reglas:
//  - Moneda USD: la indica el encabezado del archivo. Incoterm no indicado → null.
//  - Precio con decimales largos (conversión del proveedor): se redondea a centavos, mitad
//    hacia arriba, sobre el texto (sin float), y el valor original queda en `source_raw`.
//  - El proveedor no indicó la calidad. Por decisión del usuario (2026-09-25) cada línea toma
//    la calidad (OEM/AFM) cuyo precio de referencia se parece más: mediana de las líneas en
//    USD de otros proveedores para el mismo repuesto, sin las inferidas. Si otros cotizaron
//    solo una calidad, la otra se estima con la relación AFM/OEM mediana de los repuestos
//    que tienen ambas; sin ninguna referencia, la calidad mayoritaria del resto. Queda sin
//    confirmar (`part_type_estimated`), en rojo, hasta que el proveedor la indique.
//
// Uso: node scripts/load-quotes-youman.mjs <ruta.xlsx> [--apply]   (dry-run por defecto)

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
const SOURCE_FILE = 'Cotización Dongfeng E70 - Guangzhou Youman.xlsx'
const CAPTURED = '2026-09-25T00:00:00Z'
const SUPPLIER = {
  name: 'Guangzhou Youman International Automobile Trading Co., Ltd.',
  alias: 'Guangzhou Youman',
  country: 'CN',
  platform: 'alibaba',
  platform_url: 'https://umanauto.en.alibaba.com/',
  supplier_type: 'distributor',
  supplier_type_source: 'Mensaje del proveedor por WhatsApp (2026-09-25): "Trader"',
  moq: null,
  incoterm: null,
  verified: false,
  scorecard: null,
  is_placeholder: false,
  contact: null,
  source: 'cotizacion_dongfeng_e70_youman',
  source_file: `${SOURCE_FILE} (Drive: Trabajo/Repuestos/Proveedores)`,
  notes:
    'Enviado por WhatsApp el 2026-09-25 junto a la cotización: razón social, Guangdong (China), Trader y tienda de Alibaba. No verificado por otra vía. La cotización no indica calidad ni Incoterm.',
}
const TYPE_NOTE_MATCH = (type, ref) =>
  `El proveedor no indicó la calidad. Elegida por el equipo porque el precio se parece más al ${type} de otros proveedores (${ref}). Sin confirmar.`
const TYPE_NOTE_FALLBACK = (type) =>
  `El proveedor no indicó la calidad y no hay precios OEM y AFM de otros proveedores para comparar. El equipo usó ${type}, la calidad de la mayoría de sus otras líneas. Sin confirmar.`

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

const median = (values) => {
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}
const usd = (cents) => `US$${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`

const [, , xlsxPath, ...flags] = process.argv
if (!xlsxPath) {
  console.error('Uso: node scripts/load-quotes-youman.mjs <ruta.xlsx> [--apply]')
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
      type: { value: 'distributor', source: SUPPLIER.supplier_type_source, at: now },
      location: {
        value: 'Guangdong, China',
        source: 'Mensaje del proveedor por WhatsApp (2026-09-25)',
        at: now,
      },
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

  // Referencias: precios USD confirmados de otros proveedores, sin inferidas.
  const refs = new Map() // part_id → { original: number[], alternative: number[] }
  for (const d of (await db.collectionGroup('lines').get()).docs) {
    const x = d.data()
    if (x.inferred || x.supplier_id === supplier.id) continue
    if (x.price?.currency !== 'USD' || x.currency_status !== 'confirmed') continue
    if ((x.price.scale ?? 2) !== 2) continue
    const r = refs.get(x.part_id) ?? { original: [], alternative: [] }
    r[x.part_type]?.push(x.price.amount)
    refs.set(x.part_id, r)
  }

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

  // Relación AFM/OEM típica (basis points) entre repuestos con ambas calidades cotizadas: estima
  // la referencia que falta cuando otros proveedores cotizaron solo una de las dos.
  const withBoth = [...refs.values()].filter((r) => r.original.length && r.alternative.length)
  const afmOverOemBp = withBoth.length
    ? median(withBoth.map((r) => Math.round((median(r.alternative) * 10000) / median(r.original))))
    : null

  // Calidad por parecido de precio (distancia logarítmica a la referencia de cada calidad).
  for (const r of rows) {
    const ref = refs.get(r.partId)
    let oem = ref?.original.length ? median(ref.original) : null
    let afm = ref?.alternative.length ? median(ref.alternative) : null
    let refText = null
    if (oem && afm) refText = `OEM ${usd(oem)}, AFM ${usd(afm)}`
    else if (afmOverOemBp && oem) {
      afm = Math.round((oem * afmOverOemBp) / 10000)
      refText = `OEM ${usd(oem)}; AFM estimado en ${usd(afm)}, el ${Math.round(afmOverOemBp / 100)} % del OEM como en los repuestos con ambas calidades`
    } else if (afmOverOemBp && afm) {
      oem = Math.round((afm * 10000) / afmOverOemBp)
      refText = `AFM ${usd(afm)}; OEM estimado en ${usd(oem)}, con la relación de los repuestos con ambas calidades`
    }
    if (!refText) continue
    const isOem = Math.abs(Math.log(r.amount / oem)) <= Math.abs(Math.log(r.amount / afm))
    r.partType = isOem ? 'original' : 'alternative'
    r.note = TYPE_NOTE_MATCH(isOem ? 'OEM' : 'AFM', refText)
  }
  const matched = rows.filter((r) => r.partType)
  const majority =
    matched.filter((r) => r.partType === 'original').length * 2 >= matched.length
      ? 'original'
      : 'alternative'
  for (const r of rows.filter((x) => !x.partType)) {
    r.partType = majority
    r.note = TYPE_NOTE_FALLBACK(majority === 'original' ? 'OEM' : 'AFM')
  }

  const lines = rows.map((r) => ({
    part_id: r.partId,
    supplier_id: supplier.id,
    part_type: r.partType,
    part_type_estimated: true,
    part_type_note: r.note,
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

  const count = (t, list) => list.filter((r) => r.partType === t).length
  console.log(
    `Proveedor ${SUPPLIER.alias}: ${supplier.created ? (apply ? 'creado' : 'se creará') : 'existe'} (${supplier.id ?? '—'})`,
  )
  console.log(
    `${lines.length} líneas: por precio ${matched.length} (OEM ${count('original', matched)}, AFM ${count('alternative', matched)}); sin referencia ${rows.length - matched.length} → ${majority}`,
  )
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
