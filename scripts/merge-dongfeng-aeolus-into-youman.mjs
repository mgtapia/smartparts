#!/usr/bin/env node
// El contacto "Dongfeng Aeolus Dealer" (WhatsApp, 2026-09-27) resultó ser la misma empresa que
// Guangzhou Youman: mismo archivo y mismos precios que su cotización, redistribuidos por dos
// contactos distintos. Se confirmó por el usuario el 2026-09-28. Este script:
//  1. Traslada a las 137 líneas de Youman la calidad OEM que llegó confirmada solo en la
//     cotización de Aeolus (para no perder esa confirmación al borrarla).
//  2. Borra la cotización de Aeolus completa (documento + subcolección `lines`).
//  3. Borra el proveedor "Dongfeng Aeolus" (duplicado de Youman, no una empresa aparte).
//  4. Actualiza los hechos de Youman con lo nuevo que trajo ese contacto: es fábrica y emite
//     Formulario F.
// Uso: node scripts/merge-dongfeng-aeolus-into-youman.mjs   (solo aplica con --apply)
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

const YOUMAN_ID = 'DDTMz0SoLTo8fRNHC5X5'
const AEOLUS_ID = 'MWhDmvineoEuSEupINiI'
const AEOLUS_QUOTATION_ID = 'c8TuMzOI5gMjnqrk7bih'
const YOUMAN_QUOTATION_ID = 'yTDcyAqXR4Rdy2erwVhF'

const QUALITY_SOURCE =
  'Forward de WhatsApp (2026-09-27): "Oem", "Factory", "Oem from manufacturer" — recibido también ' +
  'por el contacto identificado entonces como "Dongfeng Aeolus Dealer", que resultó ser la misma ' +
  'empresa (confirmado por el usuario, 2026-09-28).'
const MERGE_NOTE =
  'El contacto de WhatsApp "Dongfeng Aeolus Dealer" (2026-09-27) resultó ser la misma empresa: ' +
  'mismo archivo y mismos precios que esta cotización, redistribuidos por dos contactos distintos. ' +
  'Se fusionó el 2026-09-28; su cotización se borró y su confirmación de calidad OEM se trasladó a ' +
  'las líneas de esta cotización.'

const apply = process.argv.includes('--apply')
const db = getAdminDb()

const aeolusLines = await db
  .collection('quotations')
  .doc(AEOLUS_QUOTATION_ID)
  .collection('lines')
  .get()
const youmanLinesSnap = await db
  .collection('quotations')
  .doc(YOUMAN_QUOTATION_ID)
  .collection('lines')
  .get()
const youmanLineByPart = new Map(youmanLinesSnap.docs.map((d) => [d.data().part_id, d]))

console.log(`Líneas de Aeolus: ${aeolusLines.size}. Líneas de Youman: ${youmanLinesSnap.size}.`)

console.log('\n--- 1. Calidad OEM a trasladar a Youman ---')
let matched = 0
let skipped = 0
for (const aeolusLine of aeolusLines.docs) {
  const a = aeolusLine.data()
  const youmanDoc = youmanLineByPart.get(a.part_id)
  if (!youmanDoc) {
    skipped++
    continue
  }
  if (!a.confirmations?.part_type) {
    skipped++
    continue
  }
  matched++
  if (apply) {
    await youmanDoc.ref.update({
      part_type: a.part_type,
      part_type_estimated: FieldValue.delete(),
      part_type_note: FieldValue.delete(),
      'confirmations.part_type': { source: QUALITY_SOURCE, at: FieldValue.serverTimestamp() },
    })
  }
}
console.log(`Trasladadas: ${matched}. Sin par o sin confirmación en Aeolus: ${skipped}.`)

console.log('\n--- 2. Borrar la cotización de Aeolus ---')
console.log(`quotations/${AEOLUS_QUOTATION_ID} + ${aeolusLines.size} líneas`)
if (apply) {
  for (const doc of aeolusLines.docs) await doc.ref.delete()
  await db.collection('quotations').doc(AEOLUS_QUOTATION_ID).delete()
}

console.log('\n--- 3. Borrar el proveedor Dongfeng Aeolus ---')
console.log(`suppliers/${AEOLUS_ID}`)
if (apply) {
  await db.collection('suppliers').doc(AEOLUS_ID).delete()
}

console.log('\n--- 4. Actualizar los hechos de Guangzhou Youman ---')
const youmanRef = db.collection('suppliers').doc(YOUMAN_ID)
const youmanDoc = await youmanRef.get()
const youmanData = youmanDoc.data()
const update = {
  supplier_type: 'factory',
  supplier_type_source: QUALITY_SOURCE,
  'facts.type': { value: 'factory', source: QUALITY_SOURCE, at: FieldValue.serverTimestamp() },
  'facts.formF': { value: 'yes', source: QUALITY_SOURCE, at: FieldValue.serverTimestamp() },
  notes: `${youmanData.notes ?? ''}\n\n${MERGE_NOTE}`.trim(),
}
console.log(JSON.stringify(update, null, 2))
if (apply) {
  await youmanRef.update(update)
}

console.log(
  apply ? '\nAplicado.' : '\nDry-run: nada se escribió. Ejecuta con --apply para aplicar.',
)
process.exit(0)
