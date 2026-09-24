#!/usr/bin/env node
// Carga la Proforma Invoice de XM Industrial Co., Limited (imagen recibida por
// WhatsApp el 2026-09-24, guardada en Drive → Repuestos/Proveedores) como
// cotizaciones. Los 15 ítems están transcritos a mano de la imagen.
//
// Reglas:
//  - Precios en USD, EXW Guangzhou, sin envío, vigencia una semana.
//  - Dos tramos por cantidad: ≥10 pzas y <10 pzas. `price` = tramo de 1 unidad
//    (el conservador); `price_tiers` guarda ambos.
//  - Calidad: el proveedor declara OEM → part_type 'original', pero SIEMPRE
//    'pending_review' (nunca auto-confirmar 'original').
//  - Hay ítems que no calzan 1:1 con la ficha (terminal 12 mm vs 14 mm,
//    amortiguador completo vs solo): se cargan todas las variantes candidatas
//    con `variant`, pendientes de que una persona elija la correcta.
//  - LH = izquierdo (IZQ), RH = derecho (DER); "LH=RH" aplica a ambos lados.
//
// Uso: node scripts/load-quotes-xm-proforma.mjs [--apply]   (dry-run por defecto)

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

const VEHICLE_SHORT_MODEL = 'E70'
const SUPPLIER_ALIAS = 'XM Industrial'
const SOURCE_FILE = 'Proforma XM Industrial - Dongfeng E70 (2026-09-24).jpeg'
const CAPTURED = '2026-09-24T00:00:00Z'
const VALID_UNTIL = '2026-10-01'

const IZQ = 'IZQ'
const DER = 'DER'
const both = (base) => [`${base} DEL ${IZQ}`, `${base} DEL ${DER}`]

// Precios en centavos de USD: [≥10 pzas, <10 pzas].
// `parts`: nombres exactos en nuestra ficha a los que aplica el ítem.
const ITEMS = [
  { no: 1, desc: 'BRAZO DE SUSPENSION LH', usd: [1254, 1478], parts: ['Bandeja DEL IZQ'] },
  { no: 2, desc: 'BRAZO DE SUSPENSION RH', usd: [1254, 1478], parts: ['Bandeja DEL DER'] },
  {
    no: 3,
    desc: 'TERMINAL DIRCCION EXTERIOR-12MM LH',
    usd: [433, 507],
    parts: ['Terminal Exterior DEL IZQ'],
    variant: '12 mm',
  },
  {
    no: 4,
    desc: 'TERMINAL DIRCCION EXTERIOR-12MM RH',
    usd: [433, 507],
    parts: ['Terminal Exterior DEL DER'],
    variant: '12 mm',
  },
  {
    no: 5,
    desc: 'TERMINAL DIRCCION INTERIOR-12MM LH=RH',
    usd: [284, 328],
    parts: ['Terminal Interior DEL IZQ (Axial)', 'Terminal Interior DEL DER (Axial)'],
    variant: '12 mm',
  },
  {
    no: 6,
    desc: 'TERMINAL DIRCCION EXTERIOR-14MM LH',
    usd: [584, 672],
    parts: ['Terminal Exterior DEL IZQ'],
    variant: '14 mm',
  },
  {
    no: 7,
    desc: 'TERMINAL DIRCCION EXTERIOR-14MM RH',
    usd: [584, 672],
    parts: ['Terminal Exterior DEL DER'],
    variant: '14 mm',
  },
  {
    no: 8,
    desc: 'TERMINAL DIRCCION INTERIOR-14MM LH=RH',
    usd: [454, 522],
    parts: ['Terminal Interior DEL IZQ (Axial)', 'Terminal Interior DEL DER (Axial)'],
    variant: '14 mm',
  },
  { no: 9, desc: 'BARRA LINK LH=RH', usd: [284, 328], parts: both('Bieleta') },
  {
    no: 10,
    desc: 'AMORTIGUADOR DELANTERO COMPLETO LH',
    usd: [3634, 4179],
    parts: ['Amortiguador DEL IZQ'],
    variant: 'completo',
  },
  {
    no: 11,
    desc: 'AMORTIGUADOR DELANTERO COMPLETO RH',
    usd: [3634, 4179],
    parts: ['Amortiguador DEL DER'],
    variant: 'completo',
  },
  {
    no: 12,
    desc: 'AMORTIGUADOR DELANTERO SOLO LH',
    usd: [1557, 1791],
    parts: ['Amortiguador DEL IZQ'],
    variant: 'solo (sin conjunto)',
  },
  {
    no: 13,
    desc: 'AMORTIGUADOR DELANTERO SOLO RH',
    usd: [1557, 1791],
    parts: ['Amortiguador DEL DER'],
    variant: 'solo (sin conjunto)',
  },
  {
    no: 14,
    desc: 'AMORTIGUADOR TRASERO COMPLETO LH=RH',
    usd: [1687, 1940],
    parts: ['Amortiguador TRAS IZQ', 'Amortiguador TRAS DER'],
    variant: 'completo',
  },
  {
    no: 15,
    desc: 'AMORTIGUADOR TRASERO SOLO LH=RH',
    usd: [1168, 1343],
    parts: ['Amortiguador TRAS IZQ', 'Amortiguador TRAS DER'],
    variant: 'solo (sin conjunto)',
  },
]

const apply = process.argv.includes('--apply')
const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')
const { findSupplierId, findVehicleId, loadQuotationIndex, upsertLines } =
  await import('./lib/model.mjs')

async function main() {
  const db = getAdminDb()
  const vehicleId = await findVehicleId(db, VEHICLE_SHORT_MODEL)
  const supplierId = await findSupplierId(db, SUPPLIER_ALIAS)
  const partsSnap = await db
    .collection('parts')
    .where('vehicle_ids', 'array-contains', vehicleId)
    .get()
  const partsByName = new Map()
  for (const d of partsSnap.docs) partsByName.set(d.data().name_es.trim(), d.id)

  const quotes = []
  const missing = []
  for (const item of ITEMS) {
    for (const partName of item.parts) {
      const partId = partsByName.get(partName)
      if (!partId) {
        missing.push(`ítem ${item.no}: "${partName}"`)
        continue
      }
      const [at10, below10] = item.usd
      quotes.push({
        part_id: partId,
        supplier_id: supplierId,
        part_type: 'original',
        price: { amount: below10, currency: 'USD', scale: 2 },
        price_tiers: [
          { min_qty: 1, amount: below10 },
          { min_qty: 10, amount: at10 },
        ],
        currency_status: 'confirmed',
        variant: item.variant ?? null,
        supplier_item: item.desc,
        moq: null,
        incoterm: 'EXW',
        incoterm_place: 'Guangzhou',
        shipping_included: false,
        packaging: 'Neutral strong package, no pallet',
        source_platform: 'direct',
        source_file: SOURCE_FILE,
        supplier_declaration: 'OEM calidad (WhatsApp 2026-09-24) — sin verificar',
        captured_at: new Date(CAPTURED),
        valid_until: VALID_UNTIL,
        match_score: null,
        match_status: 'pending_review',
      })
    }
  }

  console.log(`XM: ${quotes.length} cotizaciones desde ${ITEMS.length} ítems`)
  console.log(`  sin match de repuesto: ${missing.length}`, missing)
  const dup =
    quotes.length -
    new Set(quotes.map((q) => `${q.part_id}|${q.part_type}|${q.supplier_item}`)).size
  if (dup) console.log(`  ⚠ ${dup} repetidas`)
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
