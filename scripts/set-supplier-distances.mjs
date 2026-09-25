#!/usr/bin/env node
// Carga las distancias estimadas de cada proveedor a su puerto y aeropuerto de embarque y, donde
// faltan, el puerto y aeropuerto propuestos. Son estimaciones del equipo SIN fuente: quedan sin
// confirmar (en rojo) y con la nota de por qué se proponen. Idempotente: no pisa un dato que ya
// tenga fuente. Uso: node scripts/set-supplier-distances.mjs   (solo aplica con --apply)
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

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
const { findSupplierId } = await import('./lib/model.mjs')
const { FieldValue } = await import('firebase-admin/firestore')

const NOTE = 'Estimado por el equipo, sin fuente: distancia por carretera aproximada.'
const PLAN = [
  {
    alias: 'Henan Ronglai',
    port: [
      'Shanghai',
      'Estimado: puerto de contenedores más usado desde el centro-este de China. El proveedor no ha dicho cuál usa.',
    ],
    airport: [
      'Zhengzhou Xinzheng (CGO)',
      'Estimado: aeropuerto internacional de Zhengzhou. El proveedor no ha dicho desde cuál despacha.',
    ],
    portDistanceKm: 900,
    airportDistanceKm: 40,
  },
  { alias: 'Anhui Zuoheng', portDistanceKm: 470, airportDistanceKm: 31 },
  { alias: 'XM Industrial', portDistanceKm: 60, airportDistanceKm: 40 },
  {
    alias: 'Chongqing Jinfubo',
    port: [
      'Shanghai',
      'Estimado: puerto de contenedores más usado desde China; Chongqing no tiene puerto marítimo. El proveedor no ha dicho cuál usa.',
    ],
    airport: [
      'Chongqing Jiangbei (CKG)',
      'Estimado: aeropuerto internacional de Chongqing. El proveedor no ha dicho desde cuál despacha.',
    ],
    portDistanceKm: 1700,
    airportDistanceKm: 20,
  },
]

const apply = process.argv.includes('--apply')
const db = getAdminDb()
for (const item of PLAN) {
  const id = await findSupplierId(db, item.alias)
  const ref = db.collection('suppliers').doc(id)
  const facts = (await ref.get()).data().facts ?? {}
  const update = {}
  const put = (key, value, note) => {
    if (facts[key]?.source) return // ya confirmado con fuente
    if (facts[key]?.value != null && key !== 'portDistanceKm' && key !== 'airportDistanceKm') return
    update[`facts.${key}`] = { value, note, at: FieldValue.serverTimestamp() }
  }
  if (item.port) put('port', ...item.port)
  if (item.airport) put('airport', ...item.airport)
  put('portDistanceKm', item.portDistanceKm, NOTE)
  put('airportDistanceKm', item.airportDistanceKm, NOTE)
  console.log(item.alias, Object.keys(update).join(', ') || '(sin cambios)')
  if (apply && Object.keys(update).length) await ref.update(update)
}
process.exit(0)
