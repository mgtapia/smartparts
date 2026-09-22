#!/usr/bin/env node
// Verifica códigos OEM de un vehículo contra fichas reales de tachka.ru (tienda
// rusa de repuestos). Prueba una ficha estática por artículo bajo cada slug de
// marca en BRANDS ('dongfeng' y 'evolute' — el mismo E70 se vende rebadgeado
// como Evolute i-PRO en Rusia, y no todos los artículos están bajo ambas). 200 +
// título con "Артикул <código>" = existe; 404 = no existe ahí. Solo lectura,
// secuencial y con pausa. Escribe un JSON con el resultado por código — no toca
// Firestore. Con --skip se pueden pasar JSON previos (de este script o de
// verify-codes-autopiter.mjs) para no reconsultar códigos ya encontrados.
//
// Uso: node scripts/verify-codes-tachka.mjs <vehicleId> <salida.json> [--skip previo1.json previo2.json ...]
//   node scripts/verify-codes-tachka.mjs dongfeng_e70 out.json --skip tachka-e70.json autopiter-e70.json

import fs from 'node:fs'

const BRANDS = ['dongfeng', 'evolute']

const args = process.argv.slice(2)
const [vehicleId, outPath] = args
if (!vehicleId || !outPath) {
  console.error(
    'Uso: node scripts/verify-codes-tachka.mjs <vehicleId> <salida.json> [--skip previo1.json ...]',
  )
  process.exit(1)
}

const skipIdx = args.indexOf('--skip')
const skipFiles = skipIdx === -1 ? [] : args.slice(skipIdx + 1)
const alreadyFound = new Set()
for (const f of skipFiles) {
  const prev = JSON.parse(fs.readFileSync(f, 'utf8'))
  for (const [code, hit] of Object.entries(prev)) if (hit.found) alreadyFound.add(code)
}

const { PARTS } = await import('../src/mocks/parts.js')
const codes = [
  ...new Set(PARTS.filter((p) => p.vehicleId === vehicleId && p.oemCode).map((p) => p.oemCode)),
].filter((c) => !alreadyFound.has(c))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = {}

for (const code of codes) {
  let hit = null
  for (const brand of BRANDS) {
    const url = `https://tachka.ru/${brand}/${encodeURIComponent(code)}`
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (res.status === 200) {
        const html = await res.text()
        const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''
        const m = title.match(/^(.*?)\.\s*Артикул\s+(\S+)/)
        hit = { found: true, url, nameRu: m?.[1]?.trim() ?? title, article: m?.[2] ?? null, brand }
        break
      }
    } catch {
      // probar el siguiente slug de marca
    }
    await sleep(400)
  }
  results[code] = hit ?? { found: false, url: `https://tachka.ru/dongfeng/${code}` }
}

fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
const found = Object.values(results).filter((r) => r.found).length
console.log(
  `✔ ${found}/${codes.length} códigos de ${vehicleId} encontrados en tachka.ru (${BRANDS.join('/')}) → ${outPath}`,
)
