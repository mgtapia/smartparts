#!/usr/bin/env node
// Carga los precios "copy" (AFM) que Anhui Zuoheng puso en su cotización y que no se habían
// cargado: en cada fila el archivo trae F = precio y G = calidad ("Original"), y además
// H = otro precio e I = su calidad ("copy"). El cargador original guardó H e I crudas en
// `source_raw` sin interpretarlas; acá cada fila con I = "copy" se vuelve una línea AFM con el
// precio de H. La calidad la indica el proveedor en su propia cotización, así que queda
// confirmada con esa fuente. Moneda, Incoterm y sus confirmaciones son los de la línea original.
//
// Las filas con I = "Used" (repuesto usado) no se cargan: no son OEM ni AFM. Las líneas
// inferidas del lado opuesto tampoco: esas se generan con infer-side-quotes.mjs.
//
// Uso: node scripts/load-quotes-anhui-copy.mjs [--apply]   (dry-run por defecto)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq < 0) continue
  let v = t.slice(eq + 1).trim()
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
  process.env[t.slice(0, eq).trim()] ??= v
}
const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')
const { loadQuotationIndex, upsertLines } = await import('./lib/model.mjs')

const SOURCE_FILE = 'Cotización Dongfeng E70 - Anhui Zuoheng.xlsx'
const apply = process.argv.includes('--apply')

// Decimal exacto como texto → entero en centavos, sin pasar por float.
function toCents(raw) {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(raw ?? '').trim())
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || 0)
}

const db = getAdminDb()
const lines = (await db.collectionGroup('lines').get()).docs
  .map((d) => d.data())
  .filter((l) => l.source_file === SOURCE_FILE && !l.inferred)

const items = []
const skipped = []
for (const l of lines) {
  const label = (l.source_raw?.col_I ?? '').trim()
  if (!l.source_raw?.col_H) continue
  if (!/^copy$/i.test(label)) {
    skipped.push(`fila ${l.source_raw.row}: "${label}" a ${l.source_raw.col_H}`)
    continue
  }
  const cents = toCents(l.source_raw.col_H)
  if (cents == null) {
    skipped.push(`fila ${l.source_raw.row}: precio ilegible "${l.source_raw.col_H}"`)
    continue
  }
  const now = new Date()
  items.push({
    ...l,
    part_type: 'alternative',
    price: { amount: cents, currency: l.price.currency, scale: 2 },
    source_raw: { ...l.source_raw, price_col: 'H', quality_col: 'I' },
    captured_at: now,
    confirmations: {
      ...l.confirmations,
      part_type: {
        source: 'Indicado por el proveedor en su cotización (columna I: "copy")',
        at: now,
      },
    },
  })
}

console.log(`${items.length} líneas AFM por ${apply ? 'escribir' : 'crear (dry-run)'}.`)
if (skipped.length) console.log('No se cargan:\n  ' + skipped.join('\n  '))
if (apply) {
  const { created, updated } = await upsertLines(db, await loadQuotationIndex(db), items)
  console.log(`Creadas ${created}, actualizadas ${updated}.`)
}
process.exit(0)
