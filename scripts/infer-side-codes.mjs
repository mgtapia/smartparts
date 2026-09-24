#!/usr/bin/env node
// Propone un código provisorio para el lado que falta de un par DER/IZQ cuando
// el otro lado sí tiene código de la serie B (Dongfeng E70). En los pares con
// ambos códigos de esa serie, el derecho es el izquierdo + 1 en la mayoría (se
// calcula acá mismo y queda anotado). Es una INFERENCIA: entra siempre como
// `provisional` (rojo en la UI), con fuente "inferido" y una nota que dice cómo se
// dedujo. Nunca queda confirmado; se confirma con el proveedor o un catálogo.
//
// Uso: node scripts/infer-side-codes.mjs [--apply]   (dry-run por defecto)

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

const VEHICLE_ID = 'dongfeng_e70'
const apply = process.argv.includes('--apply')
const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')
const db = getAdminDb()

const snap = await db.collection('parts').where('vehicle_ids', 'array-contains', VEHICLE_ID).get()
const parts = snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }))

const codeOf = (p) => p.oem_codes?.[0]?.code ?? null
const isB = (c) => /^B\d+$/.test(String(c ?? ''))
const num = (c) => Number(String(c).slice(1))
const pad = (n, len) => `B${String(n).padStart(len, '0')}`
const sideOf = (name) => (/\bDER\b/.test(name) ? 'DER' : /\bIZQ\b/.test(name) ? 'IZQ' : null)
const keyOf = (name) => name.replace(/\b(DER|IZQ)\b/, '{L}')

const groups = new Map()
for (const p of parts) {
  const side = sideOf(p.name_es)
  if (!side) continue
  const k = keyOf(p.name_es)
  if (!groups.has(k)) groups.set(k, {})
  groups.get(k)[side] = p
}

// Regla medida sobre los pares que ya tienen ambos códigos de la serie B.
const stats = { total: 0, derMasUno: 0 }
for (const g of groups.values()) {
  if (!g.DER || !g.IZQ || !isB(codeOf(g.DER)) || !isB(codeOf(g.IZQ))) continue
  stats.total++
  if (num(codeOf(g.DER)) - num(codeOf(g.IZQ)) === 1) stats.derMasUno++
}
console.log(
  `Pares de la serie B con ambos códigos: ${stats.total}; derecho = izquierdo + 1 en ${stats.derMasUno}`,
)

const updates = []
for (const [k, g] of groups) {
  if (!g.DER || !g.IZQ) continue
  const known = codeOf(g.DER) ? g.DER : codeOf(g.IZQ) ? g.IZQ : null
  const missing = known === g.DER ? g.IZQ : known === g.IZQ ? g.DER : null
  if (!known || !missing || codeOf(missing) || !isB(codeOf(known))) continue
  const width = String(codeOf(known)).length - 1
  const next = known === g.DER ? num(codeOf(known)) - 1 : num(codeOf(known)) + 1
  const code = pad(next, width)
  updates.push({
    part: missing,
    code,
    sibling: known,
    reason: `${known.name_es} (${codeOf(known)})`,
  })
  console.log(`${missing.name_es}: ${code}  ← ${known.name_es} ${codeOf(known)}`)
  void k
}

if (!apply) {
  console.log(`\nDry-run: ${updates.length} códigos propuestos, nada escrito. Usar --apply.`)
  process.exit(0)
}

const note = `Código inferido, sin verificar: en ${stats.derMasUno} de ${stats.total} pares de la serie B el código derecho es el izquierdo más 1. Confirmar con el proveedor o con un catálogo antes de comprar.`
const batch = db.batch()
for (const u of updates) {
  batch.update(u.part.ref, {
    oem_codes: [{ code: u.code, source: 'inferido_lado_opuesto' }],
    code_status: 'provisional',
    code_source: `Inferido del lado opuesto: ${u.reason}`,
    sourcing_note: note,
    updated_at: new Date(),
  })
}
await batch.commit()
console.log(`Aplicado: ${updates.length} códigos provisorios escritos.`)
