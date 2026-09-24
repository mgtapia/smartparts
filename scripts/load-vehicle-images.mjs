#!/usr/bin/env node
// Carga la imagen de cada vehículo desde la carpeta del equipo en Drive
// (Trabajo > Repuestos > Fotos). Se reduce a WebP de lado máximo 900 px con
// transparencia y se guarda como data URL en `vehicles/{id}/media/{auto}` (`role: 'main'`),
// junto con su fuente. Volver a correr reemplaza la imagen. No toca ningún otro campo.
//
// Uso: node scripts/load-vehicle-images.mjs [--apply] [--dir "G:/My Drive/Trabajo/Repuestos/Fotos"]

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

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

const MAX_SIDE = 900
const QUALITY = 85
const SOURCE = 'Carpeta del equipo en Drive: Trabajo > Repuestos > Fotos'
// Modelo corto del vehículo (campo `shortModel`) → archivo.
const FILES = {
  E70: 'dongfeng e70.png',
  'Niro EV': 'kia niro.png',
  Aya: 'neta aya.png',
  Nammi: 'dongfeng nammi.png',
}

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const dirIdx = args.indexOf('--dir')
const dir = dirIdx >= 0 ? args[dirIdx + 1] : 'G:/My Drive/Trabajo/Repuestos/Fotos'

const { getAdminDb } = await import('../src/libs/admin/firebaseAdmin.js')
const { findVehicleId } = await import('./lib/model.mjs')
const db = getAdminDb()

for (const [shortModel, file] of Object.entries(FILES)) {
  const buffer = await sharp(path.join(dir, file))
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer()
  const dataUrl = `data:image/webp;base64,${buffer.toString('base64')}`
  console.log(`${shortModel}: ${file} → ${Math.round(buffer.length / 1024)} KB`)
  if (!apply) continue
  const media = db
    .collection('vehicles')
    .doc(await findVehicleId(db, shortModel))
    .collection('media')
  const existing = (await media.where('role', '==', 'main').limit(1).get()).docs[0]
  const data = { role: 'main', data_url: dataUrl, source: SOURCE, updated_at: new Date() }
  if (existing) await existing.ref.set(data)
  else await media.add(data)
}
console.log(apply ? 'Aplicado.' : 'Dry-run: no se escribió nada. Usar --apply.')
