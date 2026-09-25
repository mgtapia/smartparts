#!/usr/bin/env node
// Reporte de solo lectura: qué repuestos del vehículo en sourcing mueven más el costo si su
// peso/volumen está mal. Por repuesto cotizado calcula el flete LCL por unidad con las tarifas de
// referencia (src/mocks/costParams.js), lo compara con el precio más bajo cotizado y lo pondera
// por la cantidad estimada de la planilla del cliente. En LCL se cobra el mayor entre m³ y
// toneladas, así que casi siempre manda el volumen. No escribe nada.
//
// Uso: node scripts/report-logistics-impact.mjs [--top N]
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
const { toMicros } = await import('../src/libs/money.js')
const { DEFAULT_FX, DEFAULT_UNIT_COST_ASSUMPTIONS, DEFAULT_PARAM_SET } =
  await import('../src/mocks/costParams.js')

const topIdx = process.argv.indexOf('--top')
const TOP = topIdx === -1 ? 40 : Number(process.argv[topIdx + 1])

// Todo en micros de USD (enteros).
const RATE_MICRO_PER_RT = DEFAULT_UNIT_COST_ASSUMPTIONS.seaUsdPerRtCents * 10_000
const KG_PER_CBM = DEFAULT_PARAM_SET.freightDefaults.seaLclWmKgPerCbm
const priceUsdMicro = (price) => {
  const micros = toMicros(price)
  if (price.currency === 'USD') return micros
  if (price.currency === 'CNY') return Math.round((micros * DEFAULT_FX.cnyUsd) / 1_000_000)
  return null
}
// R/T en millonésimas: el mayor entre m³ y toneladas (con 1 m³ = KG_PER_CBM kg).
const chargeableRtMicro = (weightG, volumeCm3) =>
  Math.max(volumeCm3, Math.round((weightG * 1000) / KG_PER_CBM))
const freightMicro = (weightG, volumeCm3) =>
  Math.round((chargeableRtMicro(weightG, volumeCm3) * RATE_MICRO_PER_RT) / 1_000_000)

const db = getAdminDb()
const vehicle = (await db.collection('vehicles').where('sourcing_stage', '==', true).get()).docs[0]
const lines = (await db.collectionGroup('lines').get()).docs
  .map((d) => d.data())
  .filter((l) => !l.inferred)

const byPart = new Map()
for (const l of lines) {
  const usd = priceUsdMicro(l.price)
  if (usd == null) continue
  const prev = byPart.get(l.part_id)
  if (prev == null || usd < prev) byPart.set(l.part_id, usd)
}

const rows = []
for (const [partId, minPriceMicro] of byPart) {
  const p = (await db.collection('parts').doc(partId).get()).data()
  if (!p?.vehicle_ids?.includes(vehicle.id)) continue
  const qty = p.quantity_estimated ?? 0
  const freight = freightMicro(p.weight_g, p.volume_cm3)
  // Si el volumen real es el doble, el flete por unidad sube en este monto (y baja a la mitad si es la mitad).
  rows.push({
    name: p.name_es,
    code: p.oem_codes?.[0]?.code ?? '—',
    status: p.logistics_status,
    kg: p.weight_g / 1000,
    cm3: p.volume_cm3,
    qty,
    priceUsd: minPriceMicro / 1e6,
    freightUsd: freight / 1e6,
    freightShare: freight / (freight + minPriceMicro),
    exposureUsd: (freight * qty) / 1e6,
  })
}
rows.sort((a, b) => b.exposureUsd - a.exposureUsd)

const totalExposure = rows.reduce((s, r) => s + r.exposureUsd, 0)
let acc = 0
console.log(
  `${vehicle.data().brand} ${vehicle.data().shortModel}: ${rows.length} repuestos cotizados. Tarifa LCL US$${RATE_MICRO_PER_RT / 1e6}/R/T.`,
)
console.log(
  'Exposición = flete por unidad × cantidad estimada: lo que se desvía el costo total si el volumen real es el doble.\n',
)
console.log(
  '# | Repuesto | Código | Estado | kg | cm³ | Cant. | Precio US$ | Flete US$ | % flete | Exposición US$ | Acum.',
)
rows.slice(0, TOP).forEach((r, i) => {
  acc += r.exposureUsd
  console.log(
    [
      i + 1,
      r.name,
      r.code,
      r.status,
      r.kg,
      r.cm3,
      r.qty,
      r.priceUsd.toFixed(2),
      r.freightUsd.toFixed(2),
      `${(r.freightShare * 100).toFixed(0)}%`,
      r.exposureUsd.toFixed(0),
      `${((acc / totalExposure) * 100).toFixed(0)}%`,
    ].join(' | '),
  )
})
console.log(`\nExposición total: US$${totalExposure.toFixed(0)}`)
process.exit(0)
