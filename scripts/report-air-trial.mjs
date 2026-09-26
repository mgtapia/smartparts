#!/usr/bin/env node
// Resumen en consola de la compra de prueba por avión del vehículo en sourcing, de solo lectura.
// La página de la plataforma (/trial) usa el mismo modelo (src/features/trial/airTrialModel.js);
// este script sirve para recalcularlo sin abrir la app y para guardar el resultado en un JSON.
//
// Uso: npx vite-node -c ./vitest.config.mjs scripts/report-air-trial.mjs [--out informe.json]
//   (la configuración de Vitest da los alias @libs, @core… que usa el modelo)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { money } from '../src/libs/money.js'
import { buildAirTrial, FOCUS_MARGIN_BP, OPTIONS } from '../src/features/trial/airTrialModel.js'
import {
  DEFAULT_FX,
  DEFAULT_PARAM_SET,
  DEFAULT_UNIT_COST_ASSUMPTIONS,
  SHIPMENT_CHARGES,
} from '../src/mocks/costParams.js'

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

const outIdx = process.argv.indexOf('--out')
const OUT = outIdx === -1 ? null : process.argv[outIdx + 1]

// Firestore → la forma que usa la app (ver src/libs/repos/partsRepo.js y quotesRepo.js).
const db = getAdminDb()
const vehicle = (await db.collection('vehicles').where('sourcing_stage', '==', true).get()).docs[0]
const suppliers = (await db.collection('suppliers').get()).docs.map((d) => ({
  id: d.id,
  ...d.data(),
}))
const lines = (await db.collectionGroup('lines').get()).docs.map((d) => d.data())
const parts = (
  await db.collection('parts').where('vehicle_ids', 'array-contains', vehicle.id).get()
).docs.map((d) => {
  const raw = d.data()
  return {
    id: d.id,
    nameEs: raw.name_es,
    code: raw.oem_codes?.[0]?.code ?? null,
    weightG: raw.weight_g,
    volumeCm3: raw.volume_cm3,
    packageCm: raw.package_cm ?? null,
    logisticsStatus: raw.logistics_status ?? 'estimated',
    baselinePrice: raw.baseline_price,
    quantityEstimated: raw.quantity_estimated,
    quotes: lines
      .filter((l) => l.part_id === d.id)
      .map((l) => ({
        supplierId: l.supplier_id,
        partType: l.part_type,
        partTypeConfirmed: Boolean(l.confirmations?.part_type),
        inferred: Boolean(l.inferred),
        currency: l.price?.currency ?? null,
        price: money(l.price.amount, l.price.currency),
        incoterm: l.incoterm ?? null,
      })),
  }
})

// Distancia de cada proveedor al aeropuerto (ficha del proveedor), igual que la Calculadora.
const distance = (s) => {
  const fact = s.facts?.airportDistanceKm
  const km = Number(fact?.value ?? Number.NaN)
  return Number.isFinite(km) && km >= 0 ? { km, confirmed: Boolean(fact?.source) } : null
}
const known = suppliers.map(distance).filter(Boolean)
const averageKm = known.length ? known.reduce((a, b) => a + b.km, 0) / known.length : null
const settingsFor = (id) => {
  const d = distance(suppliers.find((s) => s.id === id))
  return {
    originDistanceKm: d?.km ?? null,
    originDistanceConfirmed: Boolean(d?.confirmed),
    originFallback: { bp: DEFAULT_UNIT_COST_ASSUMPTIONS.defaultOriginCostBp, averageKm },
  }
}

const report = buildAirTrial({
  parts,
  suppliers,
  settingsFor,
  rates: { ...DEFAULT_UNIT_COST_ASSUMPTIONS, shipmentCharges: SHIPMENT_CHARGES },
  params: DEFAULT_PARAM_SET,
  fx: DEFAULT_FX,
})
if (OUT) fs.writeFileSync(OUT, JSON.stringify(report, null, 1))

const clp = (n) => `CLP ${n.toLocaleString('es-CL')}`
const abbr = (id) => report.suppliers.find((s) => s.id === id).abbr
console.log(
  `${report.partCount} repuestos. Anomalías: ${report.anomalies.length}. Datos que faltan: ${report.missingData.length}.`,
)
console.log(
  `Fuera del pedido aéreo: ${report.logistics.length}. Ofertas de precio atípico: ${report.suspectOfferCount}.\n`,
)
for (const option of OPTIONS) {
  const r = report.scenarios[0].results[option].B
  console.log(`[${option}] ${r.parts} repuestos que conviene volar`)
  for (const x of r.single) {
    console.log(
      `   ${abbr(x.supplierIds[0])}: cubre ${x.covered}, costo ${clp(x.costClp)}, ahorro @${FOCUS_MARGIN_BP / 100} % ${clp(x.savingsClp[FOCUS_MARGIN_BP])}`,
    )
  }
}
process.exit(0)
