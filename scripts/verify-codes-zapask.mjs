#!/usr/bin/env node
// Tercera fuente: zapask.ru (tienda rusa, ficha estática por artículo bajo
// /catalog/<código>-dongfeng/). Solo consulta códigos que no están ya
// encontrados en los JSON pasados con --skip. Solo lectura, secuencial, con
// pausa. Mismo formato de salida que verify-codes-tachka.mjs.
//
// Uso: node scripts/verify-codes-zapask.mjs <vehicleId> <salida.json> --skip previo1.json ...

import fs from 'node:fs'

const args = process.argv.slice(2)
const [vehicleId, outPath] = args
if (!vehicleId || !outPath) {
  console.error(
    'Uso: node scripts/verify-codes-zapask.mjs <vehicleId> <salida.json> [--skip previo1.json ...]',
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

// autopiter.ru ya nos dio falsos negativos por 429 (rate limit) leídos como
// "no existe" antes de tener este backoff — no repetir el error acá.
async function fetchWithBackoff(url, attempt = 1) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (res.status === 429 && attempt <= 4) {
    const wait = attempt * 8000
    console.log(`  429, esperando ${wait / 1000}s (intento ${attempt})...`)
    await sleep(wait)
    return fetchWithBackoff(url, attempt + 1)
  }
  return res
}

let i = 0
for (const code of codes) {
  i++
  const url = `https://www.zapask.ru/catalog/${encodeURIComponent(code.toLowerCase())}-dongfeng/`
  try {
    const res = await fetchWithBackoff(url)
    if (res.status === 200) {
      const html = await res.text()
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''
      results[code] = { found: true, site: 'zapask.ru', url, nameRu: title.split('|')[0].trim() }
    } else {
      results[code] = { found: false, status: res.status, url }
    }
  } catch (err) {
    results[code] = { found: false, error: err.message, url }
  }
  if (i % 10 === 0) console.log(`  ${i}/${codes.length}...`)
  await sleep(1500)
}

fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
const found = Object.values(results).filter((r) => r.found).length
console.log(`✔ ${found}/${codes.length} códigos adicionales encontrados en zapask.ru → ${outPath}`)
