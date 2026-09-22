#!/usr/bin/env node
// Segunda fuente para verificar códigos: autopiter.ru (agregador ruso, resultados
// renderizados en el servidor). Solo consulta los códigos que todavía no están
// encontrados en el JSON de scripts/verify-codes-tachka.mjs. Un código cuenta como
// encontrado si hay ofertas cuyo nombre contiene ese artículo exacto. Solo
// lectura, secuencial y con pausa. Escribe un JSON con la misma forma que el de
// tachka (más `site`), listo para apply-tachka-verification.mjs.
//
// Uso: node scripts/verify-codes-autopiter.mjs <vehicleId> <previo.json> <salida.json>

import fs from 'node:fs'

const [, , vehicleId, prevPath, outPath] = process.argv
if (!vehicleId || !prevPath || !outPath) {
  console.error(
    'Uso: node scripts/verify-codes-autopiter.mjs <vehicleId> <previo.json> <salida.json>',
  )
  process.exit(1)
}

const prev = JSON.parse(fs.readFileSync(prevPath, 'utf8'))
const { PARTS } = await import('../src/mocks/parts.js')
const codes = [
  ...new Set(PARTS.filter((p) => p.vehicleId === vehicleId && p.oemCode).map((p) => p.oemCode)),
].filter((c) => !prev[c]?.found)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = {}

for (const code of codes) {
  const url = `https://autopiter.ru/goods/${encodeURIComponent(code.toLowerCase())}`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const html = await res.text()
    const names = [...html.matchAll(/itemProp="name" content="([^"]*)"/g)].map((m) => m[1])
    const matching = names.filter((n) => n.toUpperCase().includes(code.toUpperCase()))
    if (matching.length) {
      results[code] = {
        found: true,
        site: 'autopiter.ru',
        url,
        nameRu: matching[0]
          .replace(/^\(\d+\)\s*/, '')
          .replace(/\s+/g, ' ')
          .trim(),
        offers: matching.length,
      }
    } else {
      results[code] = { found: false, status: res.status, url }
    }
  } catch (err) {
    results[code] = { found: false, error: err.message, url }
  }
  await sleep(500)
}

fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
const found = Object.values(results).filter((r) => r.found).length
console.log(
  `✔ ${found}/${codes.length} códigos adicionales encontrados en autopiter.ru → ${outPath}`,
)
