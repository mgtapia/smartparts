#!/usr/bin/env node
// Carga a Firestore las cotizaciones de proveedores chinos para Dongfeng E70
// (archivos xlsx guardados en Drive → Repuestos/Proveedores). Lee el xlsx
// directo (Expand-Archive + regex, sin dependencias) y empareja cada fila con
// su repuesto por nombre + vehículo — NO por código, porque hay códigos
// repetidos entre repuestos distintos (ej. 5705001).
//
// Reglas (docs/MODELO-DE-DATOS.md §quotes):
//  - El precio va en la moneda del proveedor (config por fuente). Si no está
//    confirmada → currency_status 'unconfirmed'; se confirma después sin
//    tocar el monto.
//  - Nunca auto-confirmar part_type 'original' → todo entra 'pending_review'.
//  - Ids deterministas: volver a correr sobrescribe, no duplica.
//
// Uso: node scripts/load-quotes-dongfeng-e70.mjs <henan|file3|dealer> <ruta.xlsx> [--apply]
// Sin --apply es un dry-run (solo reporta).

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

// El vehículo y los proveedores se buscan por campos (modelo corto, alias): ningún id se fija a mano.
const VEHICLE_SHORT_MODEL = 'E70'

// Cada archivo tiene su propio layout de columnas.
const SOURCES = {
  henan: {
    supplierAlias: 'Henan Ronglai',
    file: 'Cotización Dongfeng E70 - Henan Ronglai.xlsx',
    // F = calidad OEM, G = calidad AFM (repuesto de tercero)
    prices: [
      { col: 'F', partType: 'original' },
      { col: 'G', partType: 'alternative' },
    ],
    notes: [],
    currency: 'USD',
    currencyStatus: 'confirmed',
    incoterm: 'EXW',
  },
  file3: {
    supplierAlias: 'Anhui Zuoheng',
    file: 'Cotización Dongfeng E70 - Proveedor sin identificar.xlsx',
    // F = precio; G = calidad ("Original" / "copy"). H e I no tienen
    // encabezado — se guardan crudas, sin interpretar.
    prices: [{ col: 'F', typeCol: 'G' }],
    notes: ['H', 'I'],
    currency: 'USD',
    currencyStatus: 'confirmed',
    incoterm: 'EXW',
  },
  // Dealer (Alibaba). F = alternative, G = original, en yuanes por la
  // diferencia de magnitud con el resto y porque I/J (USD) las calculó el
  // equipo como F/G × 1,03 ÷ 6,65 — moneda sin confirmar. I/J no se cargan
  // como precio: es un dato derivado, no del proveedor.
  dealer: {
    supplierAlias: 'Chongqing Jinfubo',
    file: 'Cotización Dongfeng E70 - Dealer Alibaba cqjfb.xlsx',
    prices: [
      { col: 'F', partType: 'alternative' },
      { col: 'G', partType: 'original' },
    ],
    notes: ['I', 'J'],
    currency: 'CNY',
    currencyStatus: 'unconfirmed',
    incoterm: null,
  },
}

function parseNumber(raw) {
  // Decimal exacto como string → entero escala 2, sin pasar por float.
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(raw ?? '').trim())
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || 0)
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

const [, , sourceKey, xlsxPath, ...flags] = process.argv
const source = SOURCES[sourceKey]
if (!source || !xlsxPath) {
  console.error(
    'Uso: node scripts/load-quotes-dongfeng-e70.mjs <henan|file3|dealer> <ruta.xlsx> [--apply]',
  )
  process.exit(1)
}
const apply = flags.includes('--apply')

const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')
const { findSupplierId, findVehicleId, loadQuotationIndex, upsertLines } =
  await import('./lib/model.mjs')

async function main() {
  const db = getAdminDb()
  const vehicleId = await findVehicleId(db, VEHICLE_SHORT_MODEL)
  const supplierId = await findSupplierId(db, source.supplierAlias)
  const partsSnap = await db
    .collection('parts')
    .where('vehicle_ids', 'array-contains', vehicleId)
    .get()
  const partsByName = new Map()
  for (const d of partsSnap.docs) partsByName.set(d.data().name_es.trim().toLowerCase(), d.id)

  const now = new Date()
  const quotes = []
  const unmatched = []
  const skipped = []

  for (const { row, cells } of readSheet(xlsxPath).slice(1)) {
    const name = (cells.A || '').trim()
    if (!name) continue
    const partId = partsByName.get(name.toLowerCase())
    if (!partId) {
      unmatched.push(`fila ${row}: "${name}"`)
      continue
    }
    for (const p of source.prices) {
      const amount = parseNumber(cells[p.col])
      if (cells[p.col] === undefined) continue
      if (amount === null) {
        skipped.push(`fila ${row}: "${name}" precio "${cells[p.col]}"`)
        continue
      }
      let partType = p.partType
      if (p.typeCol) {
        const t = (cells[p.typeCol] || '').trim().toLowerCase()
        partType = t === 'original' ? 'original' : 'alternative'
      }
      const sourceRaw = { row, supplier_code: (cells.E || '').trim() }
      for (const n of source.notes)
        if (cells[n] !== undefined) sourceRaw[`col_${n}`] = cells[n].trim()
      if (p.typeCol) sourceRaw.quality_label = (cells[p.typeCol] || '').trim()
      quotes.push({
        part_id: partId,
        supplier_id: supplierId,
        part_type: partType,
        price: { amount, currency: source.currency, scale: 2 },
        currency_status: source.currencyStatus,
        moq: null,
        incoterm: source.incoterm,
        source_platform: 'direct',
        source_file: source.file,
        source_raw: sourceRaw,
        captured_at: now,
        valid_until: null,
        match_score: null,
        match_status: 'pending_review',
      })
    }
  }

  console.log(
    `${sourceKey}: ${quotes.length} cotizaciones (${quotes.filter((q) => q.part_type === 'original').length} original, ${quotes.filter((q) => q.part_type === 'alternative').length} alternative)`,
  )
  console.log(`  sin match de repuesto: ${unmatched.length}`, unmatched.slice(0, 10))
  console.log(`  precio no numérico (omitidas): ${skipped.length}`)
  const dup = quotes.length - new Set(quotes.map((q) => `${q.part_id}|${q.part_type}`)).size
  if (dup) console.log(`  ⚠ ${dup} repetidas (misma pieza y calidad dos veces en el archivo)`)

  if (!apply) {
    console.log('Dry-run — nada escrito. Repetir con --apply.')
    return
  }
  const { created, updated } = await upsertLines(db, await loadQuotationIndex(db), quotes)
  console.log(`✔ Líneas de cotización: ${created} creadas, ${updated} actualizadas.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✖ Falló:', err.message)
    process.exit(1)
  })
