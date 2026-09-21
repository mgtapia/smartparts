#!/usr/bin/env node
// Verifica códigos OEM de un vehículo contra fichas reales de tachka.ru (tienda
// rusa de repuestos Dongfeng, una ficha estática por artículo). 200 + título con
// "Артикул <código>" = el artículo existe con marca DongFeng; 404 = no existe ahí.
// Solo lectura, secuencial y con pausa (no es un crawler agresivo). Escribe un
// JSON con el resultado por código — no toca Firestore.
//
// Uso: node scripts/verify-codes-tachka.mjs <vehicleId> <salida.json>
//   node scripts/verify-codes-tachka.mjs dongfeng_e70 out.json

import fs from 'node:fs'

const [, , vehicleId, outPath] = process.argv
if (!vehicleId || !outPath) {
  console.error('Uso: node scripts/verify-codes-tachka.mjs <vehicleId> <salida.json>')
  process.exit(1)
}

const { PARTS } = await import('../src/mocks/parts.js')
const codes = [
  ...new Set(PARTS.filter((p) => p.vehicleId === vehicleId && p.oemCode).map((p) => p.oemCode)),
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = {}

for (const code of codes) {
  const url = `https://tachka.ru/dongfeng/${encodeURIComponent(code)}`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (res.status === 200) {
      const html = await res.text()
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''
      const m = title.match(/^(.*?)\.\s*Артикул\s+(\S+)/)
      results[code] = { found: true, url, nameRu: m?.[1]?.trim() ?? title, article: m?.[2] ?? null }
    } else {
      results[code] = { found: false, status: res.status, url }
    }
  } catch (err) {
    results[code] = { found: false, error: err.message, url }
  }
  await sleep(400)
}

fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
const found = Object.values(results).filter((r) => r.found).length
console.log(
  `✔ ${found}/${codes.length} códigos de ${vehicleId} encontrados en tachka.ru → ${outPath}`,
)
