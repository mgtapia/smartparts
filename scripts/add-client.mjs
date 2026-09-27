#!/usr/bin/env node
// Agrega un cliente potencial. Idempotente: si ya existe un cliente con ese nombre, no lo
// duplica. Sin datos inventados: solo el nombre y la nota con la fuente; RUT y contacto quedan
// sin dato hasta confirmarlos. Uso: node scripts/add-client.mjs   (solo escribe con --apply)
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
const { FieldValue } = await import('firebase-admin/firestore')

const CLIENT = {
  name: 'E-mov',
  notes:
    'Cliente potencial: https://e-mov.cl/ (agregado 2026-09-27, sin RUT ni contacto confirmados).',
}

const apply = process.argv.includes('--apply')
const db = getAdminDb()

const existing = await db.collection('clients').where('name', '==', CLIENT.name).limit(1).get()
if (!existing.empty) {
  console.log(`Ya existe "${CLIENT.name}" (${existing.docs[0].id}). No se crea de nuevo.`)
  process.exit(0)
}

console.log(`${apply ? 'Creando' : '[dry-run] Crearía'} cliente:`, CLIENT)
if (!apply) {
  console.log('Nada escrito. Repetir con --apply para guardarlo.')
  process.exit(0)
}

const ref = await db.collection('clients').add({
  name: CLIENT.name,
  rut: null,
  contact: { person: null, email: null, phone: null },
  notes: CLIENT.notes,
  created_at: FieldValue.serverTimestamp(),
  updated_at: FieldValue.serverTimestamp(),
})
console.log(`Creado: clients/${ref.id}`)
