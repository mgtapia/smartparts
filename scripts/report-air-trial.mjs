#!/usr/bin/env node
// Informe de solo lectura para la primera compra de prueba del vehículo en sourcing, por vía
// aérea. Hace dos cosas, sin usar el simulador de pedidos:
//   1. Detecta anomalías en precios, cotizaciones, códigos y logística.
//   2. Compara con qué proveedor(es) quedarnos, en tres casos (todos los repuestos, solo los que
//      conviene volar y el top de demanda), para cada calidad por separado.
//
// Usa el costo unitario del motor (`computeUnitCost`, modo aéreo) con las tarifas de referencia de
// src/mocks/costParams.js. Los gastos que se cobran por embarque (despacho, guía aérea, reparto,
// mínimos del agente de aduanas) no se prorratean: se cobran una vez por proveedor que se use, porque
// cada proveedor despacha por separado. Nada se escribe en Firestore.
//
// Uso: npx vite-node scripts/report-air-trial.mjs [--out informe.json] [--html informe.html]
//   --html arma la página del informe (scripts/templates/air-trial-report.html) con los datos.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeUnitCost } from '../src/core/costing/unitCost.js'
import { toUsdMicro } from '../src/libs/fx.js'
import { money } from '../src/libs/money.js'
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
const htmlIdx = process.argv.indexOf('--html')
const HTML_OUT = htmlIdx === -1 ? null : process.argv[htmlIdx + 1]

// ── Parámetros del análisis ─────────────────────────────────────────────────────────────────────
const MARGINS_BP = [0, 1000, 1500, 2000] // markup sobre nuestro costo puesto en Chile
const FOCUS_MARGIN_BP = 1500
const TOP_DEMAND = 30
const OUTLIER_FACTOR = 3 // precio > 3× o < 1/3 de la mediana entre proveedores
const OVERSIZE_CM = 150 // más de esto en un lado: exige avión de carga
const DG_NAME = /compresor|bater[ií]a|airbag|pretensor|bolsa de aire|litio/i
const QUALITIES = ['original', 'alternative']
const QUALITY_ES = { original: 'OEM', alternative: 'AFM' }
const MAX_COMBO = 3
const SCENARIOS = [
  { key: 'base', labelEs: 'Base', rate: 1, vol: 1, qty: 1 },
  { key: 'rate_lo', labelEs: 'Tarifa aérea −30 %', rate: 0.7, vol: 1, qty: 1 },
  { key: 'rate_hi', labelEs: 'Tarifa aérea +30 %', rate: 1.3, vol: 1, qty: 1 },
  { key: 'vol_x2', labelEs: 'Volumen real el doble', rate: 1, vol: 2, qty: 1 },
  { key: 'qty_25', labelEs: 'Pedido de prueba: 25 % de la cantidad', rate: 1, vol: 1, qty: 0.25 },
  { key: 'qty_10', labelEs: 'Pedido de prueba: 10 % de la cantidad', rate: 1, vol: 1, qty: 0.1 },
]

// Hallazgos de la investigación de códigos y logística que no salen de un cálculo.
const KNOWN_FINDINGS = [
  {
    severity: 'alta',
    area: 'nombres',
    titleEs: 'Tapabarro y Guardafango con la traducción al inglés cruzada',
    detailEs:
      'Un proveedor puede haber cotizado la pieza equivocada. Confirmar con foto o dibujo antes de pagar.',
  },
  {
    severity: 'alta',
    area: 'nombres',
    titleEs: '"Reflector Portalón" son focos traseros interiores',
    detailEs: 'El nombre del cliente no describe la pieza; confirmar cuál se quiere.',
  },
  {
    severity: 'media',
    area: 'códigos',
    titleEs: 'Disco de freno trasero: 4581005 frente a 4551007 del cliente',
    detailEs: 'Dos códigos posibles; el proveedor debe confirmar el que corresponde al VIN.',
  },
  {
    severity: 'media',
    area: 'logística',
    titleEs: 'Compresor de A/C posiblemente cargado con nitrógeno (UN1956)',
    detailEs:
      'Puede ser mercancía peligrosa por aire. Pedir la hoja MSDS antes de cotizarlo por avión.',
  },
]

// ── Utilidades de dinero (enteros) ──────────────────────────────────────────────────────────────
const CLP_PER_USD_MICRO_BIG = BigInt(DEFAULT_FX.usdClp) // micro-CLP por USD
/** Micros de USD → pesos chilenos enteros, con BigInt para no perder precisión. */
const usdMicroToClp = (usdMicro) =>
  Number(
    (BigInt(Math.round(usdMicro)) * CLP_PER_USD_MICRO_BIG + 500_000_000_000n) / 1_000_000_000_000n,
  )
const median = (nums) => {
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}
const usd = (micro) => micro / 1e6

// ── Datos ───────────────────────────────────────────────────────────────────────────────────────
const db = getAdminDb()
const vehicleDoc = (await db.collection('vehicles').where('sourcing_stage', '==', true).get())
  .docs[0]
const partsSnap = await db
  .collection('parts')
  .where('vehicle_ids', 'array-contains', vehicleDoc.id)
  .get()
const parts = partsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
const partById = new Map(parts.map((p) => [p.id, p]))
const suppliers = (await db.collection('suppliers').get()).docs.map((d) => ({
  id: d.id,
  ...d.data(),
}))
const allLines = (await db.collectionGroup('lines').get()).docs.map((d) => d.data())
const lines = allLines.filter((l) => partById.has(l.part_id) && !l.inferred)

const researchPath = path.join(root, 'scripts/data/logistics-research-dongfeng-e70.json')
const research = new Map(JSON.parse(fs.readFileSync(researchPath, 'utf8')).map((e) => [e.name, e]))

const supplierName = (s) => s.alias ?? s.name
const distanceOf = (s) => {
  const fact = s.facts?.airportDistanceKm
  const km = Number(fact?.value ?? Number.NaN)
  return Number.isFinite(km) && km >= 0
    ? { km, confirmed: !!fact?.source }
    : { km: null, confirmed: false }
}
const knownKm = suppliers.map((s) => distanceOf(s).km).filter((k) => k != null)
const averageKm = knownKm.length ? knownKm.reduce((a, b) => a + b, 0) / knownKm.length : null

// Cada proveedor despacha por separado: gastos por embarque, una vez por proveedor usado.
const AIR_FIXED = SHIPMENT_CHARGES.filter((c) => c.modes.includes('air'))
const perShipmentMicro = AIR_FIXED.reduce(
  (sum, c) =>
    sum +
    (c.basis === 'per_shipment' || c.basis === 'percent_plus_fixed' ? c.amountCents * 10_000 : 0),
  0,
)
const minOf = (code) => (AIR_FIXED.find((c) => c.code === code)?.minCents ?? 0) * 10_000
const AGENT_MIN = minOf('customs_agent')
const INLAND_MIN = minOf('inland_china')
const INSURANCE_MIN = DEFAULT_PARAM_SET.insurance.minPremium.amount * 10_000

/** Gastos por embarque llevados a cero: el costo unitario queda solo con lo que escala con la pieza. */
const variableCharges = SHIPMENT_CHARGES.map((c) => ({
  ...c,
  amountCents: c.basis === 'per_shipment' || c.basis === 'percent_plus_fixed' ? 0 : c.amountCents,
  minCents: c.minCents == null ? c.minCents : 0,
}))

// ── Ofertas: una por repuesto × proveedor × calidad (la de menor precio) ────────────────────────
function buildOffers({ rate, vol }) {
  const assumptions = {
    ...DEFAULT_UNIT_COST_ASSUMPTIONS,
    airUsdPerKgCents: Math.round(DEFAULT_UNIT_COST_ASSUMPTIONS.airUsdPerKgCents * rate),
    shipmentCharges: variableCharges,
  }
  const supplierById = new Map(suppliers.map((s) => [s.id, s]))
  const best = new Map()
  for (const l of lines) {
    const key = `${l.part_id}|${l.supplier_id}|${l.part_type}`
    const usdMicro = toUsdMicro(l.price, DEFAULT_FX)
    const prev = best.get(key)
    if (!prev || usdMicro < prev.priceUsdMicro) best.set(key, { line: l, priceUsdMicro: usdMicro })
  }
  const offers = []
  for (const { line: l, priceUsdMicro } of best.values()) {
    const p = partById.get(l.part_id)
    const s = supplierById.get(l.supplier_id)
    if (!p || !s || !(p.weight_g > 0) || !(p.volume_cm3 > 0)) continue
    const dist = distanceOf(s)
    const unit = computeUnitCost({
      unitPrice: money(l.price.amount, l.price.currency),
      incoterm: l.incoterm ?? null,
      originDistanceKm: dist.km,
      originDistanceConfirmed: dist.confirmed,
      originFallback: { bp: DEFAULT_UNIT_COST_ASSUMPTIONS.defaultOriginCostBp, averageKm },
      formF: s.facts?.formF?.value ?? 'unknown',
      weightG: p.weight_g,
      volumeCm3: Math.round(p.volume_cm3 * vol),
      logisticsConfirmed: false,
      mode: 'air',
      assumptions,
      params: DEFAULT_PARAM_SET,
      fx: DEFAULT_FX,
    })
    if (unit.landedNetUsdMicro == null) {
      offers.push({ partId: p.id, supplierId: s.id, quality: l.part_type, blocked: unit.blockers })
      continue
    }
    const comp = (code) => unit.components.find((c) => c.code === code)
    const item = (code, itemCode) =>
      comp(code)?.items?.find((i) => i.code === itemCode)?.usdMicro ?? 0
    offers.push({
      partId: p.id,
      supplierId: s.id,
      quality: l.part_type,
      qualityConfirmed: !!l.confirmations?.part_type,
      priceUsdMicro,
      freightUsdMicro: comp('freight').usdMicro,
      landedUsdMicro: unit.landedNetUsdMicro, // sin gastos por embarque
      agentMicro: item('localCosts', 'customs_agent'),
      inlandMicro: item('origin', 'inland_china'),
      insuranceMicro: comp('insurance').usdMicro,
      chargeableKg: Math.max(p.weight_g / 1000, (p.volume_cm3 * vol) / 6000),
    })
  }
  return offers
}

// ── Costo de un reparto: variable + gastos por embarque de cada proveedor usado ────────────────
/** @param {{offer: object, qty: number}[]} assigned */
function costAssignments(assigned) {
  const bySupplier = new Map()
  for (const { offer, qty } of assigned) {
    const g = bySupplier.get(offer.supplierId) ?? {
      variable: 0,
      agent: 0,
      inland: 0,
      ins: 0,
      kg: 0,
    }
    g.variable += offer.landedUsdMicro * qty
    g.agent += offer.agentMicro * qty
    g.inland += offer.inlandMicro * qty
    g.ins += offer.insuranceMicro * qty
    g.kg += offer.chargeableKg * qty
    bySupplier.set(offer.supplierId, g)
  }
  let total = 0
  const perSupplier = []
  for (const [supplierId, g] of bySupplier) {
    // Los mínimos por embarque solo suman lo que falta para llegar al mínimo.
    const topUps =
      Math.max(0, AGENT_MIN - g.agent) +
      Math.max(0, INLAND_MIN - g.inland) +
      Math.max(0, INSURANCE_MIN - g.ins)
    const fixed = perShipmentMicro + topUps
    total += g.variable + fixed
    perSupplier.push({ supplierId, variable: g.variable, fixed, kg: g.kg })
  }
  return { totalUsdMicro: total, perSupplier }
}

// ── Análisis por caso ───────────────────────────────────────────────────────────────────────────
const scaledQty = (p, f) => Math.max(1, Math.round((p.quantity_estimated ?? 1) * f))
const baselineClp = (p) => p.baseline_price?.amount ?? null

function subsets(ids, maxSize) {
  const out = []
  const rec = (start, cur) => {
    if (cur.length > 0) out.push([...cur])
    if (cur.length === maxSize) return
    for (let i = start; i < ids.length; i++) rec(i + 1, [...cur, ids[i]])
  }
  rec(0, [])
  return out
}

/** Reparto de los repuestos entre un conjunto de proveedores: cada uno al de menor costo variable. */
function evaluateSet(setIds, offersByPart, partList, qtyFactor) {
  const assigned = []
  let baseline = 0
  let uncovered = 0
  for (const p of partList) {
    const options = (offersByPart.get(p.id) ?? []).filter((o) => setIds.includes(o.supplierId))
    const qty = scaledQty(p, qtyFactor)
    if (!options.length) {
      uncovered++
      continue
    }
    options.sort((a, b) => a.landedUsdMicro - b.landedUsdMicro)
    assigned.push({ offer: options[0], qty, part: p })
    baseline += (baselineClp(p) ?? 0) * qty
  }
  const cost = costAssignments(assigned)
  const costClp = usdMicroToClp(cost.totalUsdMicro)
  return {
    supplierIds: setIds,
    covered: assigned.length,
    uncovered,
    baselineClp: baseline,
    costClp,
    savingsClp: Object.fromEntries(
      MARGINS_BP.map((m) => [m, baseline - Math.round((costClp * (10_000 + m)) / 10_000)]),
    ),
    estimatedQualityLines: assigned.filter((a) => a.offer.qualityConfirmed === false).length,
    perSupplier: cost.perSupplier.map((s) => ({
      supplierId: s.supplierId,
      parts: assigned.filter((a) => a.offer.supplierId === s.supplierId).length,
      variableClp: usdMicroToClp(s.variable),
      fixedClp: usdMicroToClp(s.fixed),
      kg: Math.round(s.kg * 10) / 10,
    })),
  }
}

function analyzeScenario(offers, scenario) {
  const flagged = new Set(
    parts.filter((p) => DG_NAME.test(p.name_es) || oversize(p)).map((p) => p.id),
  )
  const supplierIds = suppliers.map((s) => s.id)
  const out = {}
  for (const quality of QUALITIES) {
    const qOffers = offers.filter(
      (o) =>
        o.quality === quality &&
        o.landedUsdMicro != null &&
        !suspectOffers.has(`${o.partId}|${o.supplierId}|${o.quality}`),
    )
    const offersByPart = new Map()
    for (const o of qOffers) {
      if (!offersByPart.has(o.partId)) offersByPart.set(o.partId, [])
      offersByPart.get(o.partId).push(o)
    }
    const cases = {
      A: parts,
      B: parts.filter((p) => {
        if (flagged.has(p.id) || baselineClp(p) == null) return false
        const best = Math.min(...(offersByPart.get(p.id) ?? []).map((o) => o.landedUsdMicro))
        return Number.isFinite(best) && usdMicroToClp(best) < baselineClp(p)
      }),
      C: [...parts]
        .filter((p) => baselineClp(p) != null)
        .sort((a, b) => baselineClp(b) * scaledQty(b, 1) - baselineClp(a) * scaledQty(a, 1))
        .slice(0, TOP_DEMAND),
    }
    out[quality] = {}
    for (const [caseKey, list] of Object.entries(cases)) {
      const results = subsets(supplierIds, MAX_COMBO)
        .map((set) => evaluateSet(set, offersByPart, list, scenario.qty))
        .filter((r) => r.covered > 0)
      const focus = (r) => r.savingsClp[FOCUS_MARGIN_BP]
      results.sort((a, b) => focus(b) - focus(a))
      const single = results.filter((r) => r.supplierIds.length === 1)
      out[quality][caseKey] = {
        parts: list.length,
        baselineClp: list.reduce(
          (s, p) => s + (baselineClp(p) ?? 0) * scaledQty(p, scenario.qty),
          0,
        ),
        single: single.sort((a, b) => focus(b) - focus(a)),
        best: results.slice(0, 6),
        bestPerSize: [1, 2, 3].map((n) => results.find((r) => r.supplierIds.length === n) ?? null),
      }
    }
  }
  return out
}

// ── Anomalías ───────────────────────────────────────────────────────────────────────────────────
function oversize(p) {
  const pkg = research.get(p.name_es)?.package_cm
  return Array.isArray(pkg) && Math.max(...pkg) >= OVERSIZE_CM
}

const baseOffers = buildOffers({ rate: 1, vol: 1 })
const anomalies = []
// Ofertas con precio atípico: no deciden la recomendación hasta que el proveedor las confirme.
const suspectOffers = new Set()
const add = (a) => anomalies.push(a)
const sName = new Map(suppliers.map((s) => [s.id, supplierName(s)]))

// Precios atípicos entre proveedores para la misma calidad.
const groups = new Map()
for (const o of baseOffers) {
  if (o.priceUsdMicro == null) continue
  const k = `${o.partId}|${o.quality}`
  if (!groups.has(k)) groups.set(k, [])
  groups.get(k).push(o)
}
for (const [k, list] of groups) {
  if (list.length < 3) continue
  const med = median(list.map((o) => o.priceUsdMicro))
  for (const o of list) {
    const hi = o.priceUsdMicro > med * OUTLIER_FACTOR
    const lo = o.priceUsdMicro * OUTLIER_FACTOR < med
    if (!hi && !lo) continue
    suspectOffers.add(`${o.partId}|${o.supplierId}|${o.quality}`)
    const p = partById.get(o.partId)
    add({
      severity: lo ? 'alta' : 'media',
      area: 'precio',
      partName: p.name_es,
      supplier: sName.get(o.supplierId),
      quality: QUALITY_ES[o.quality],
      titleEs: `${lo ? 'Precio muy bajo' : 'Precio muy alto'} frente a los otros proveedores`,
      detailEs: `US$ ${usd(o.priceUsdMicro).toFixed(2)} contra una mediana de US$ ${usd(med).toFixed(2)} entre ${list.length} proveedores. ${lo ? 'Puede ser otra pieza, una parte suelta o un error de cotización.' : 'Puede ser un error de unidad o de moneda.'}`,
    })
  }
  void k
}

// AFM más caro que el OEM del mismo proveedor.
for (const p of parts) {
  for (const s of suppliers) {
    const oem = baseOffers.find(
      (o) => o.partId === p.id && o.supplierId === s.id && o.quality === 'original',
    )
    const afm = baseOffers.find(
      (o) => o.partId === p.id && o.supplierId === s.id && o.quality === 'alternative',
    )
    if (
      oem?.priceUsdMicro != null &&
      afm?.priceUsdMicro != null &&
      afm.priceUsdMicro > oem.priceUsdMicro
    ) {
      add({
        severity: 'media',
        area: 'precio',
        partName: p.name_es,
        supplier: supplierName(s),
        quality: 'AFM',
        titleEs: 'La alternativa cuesta más que el original',
        detailEs: `AFM US$ ${usd(afm.priceUsdMicro).toFixed(2)} contra OEM US$ ${usd(oem.priceUsdMicro).toFixed(2)} del mismo proveedor.`,
      })
    }
  }
}

// Volar la pieza cuesta más que lo que hoy paga el cliente, aun con el mejor proveedor.
const bestByPartQuality = new Map()
for (const o of baseOffers) {
  if (o.landedUsdMicro == null) continue
  const k = `${o.partId}|${o.quality}`
  const prev = bestByPartQuality.get(k)
  if (!prev || o.landedUsdMicro < prev.landedUsdMicro) bestByPartQuality.set(k, o)
}
let notWorthFlying = 0
for (const p of parts) {
  const base = baselineClp(p)
  if (base == null) continue
  const cands = QUALITIES.map((q) => bestByPartQuality.get(`${p.id}|${q}`)).filter(Boolean)
  if (!cands.length) continue
  const best = cands.sort((a, b) => a.landedUsdMicro - b.landedUsdMicro)[0]
  const landedClp = usdMicroToClp(best.landedUsdMicro)
  if (landedClp <= base) continue
  notWorthFlying++
  add({
    severity: 'media',
    area: 'logística',
    partName: p.name_es,
    supplier: sName.get(best.supplierId),
    quality: QUALITY_ES[best.quality],
    titleEs: 'No conviene traerlo por avión',
    detailEs: `Costo puesto en Chile CLP ${landedClp.toLocaleString('es-CL')} contra CLP ${base.toLocaleString('es-CL')} que paga hoy el cliente, con ${best.chargeableKg.toFixed(1)} kg cobrables.`,
  })
}

// Mercancía peligrosa y piezas fuera de medida.
for (const p of parts) {
  if (DG_NAME.test(p.name_es)) {
    add({
      severity: 'alta',
      area: 'logística',
      partName: p.name_es,
      titleEs: 'Posible mercancía peligrosa por avión',
      detailEs: 'Pedir la hoja MSDS y confirmar con el forwarder antes de incluirla en el pedido.',
    })
  }
  if (oversize(p)) {
    const pkg = research.get(p.name_es).package_cm
    add({
      severity: 'media',
      area: 'logística',
      partName: p.name_es,
      titleEs: 'Fuera de medida para avión de pasajeros',
      detailEs: `Bulto de ${pkg.join(' × ')} cm: puede exigir avión de carga y cobrar recargo.`,
    })
  }
}

// Códigos: repetidos entre repuestos distintos y repuestos sin código.
const byCode = new Map()
for (const p of parts) {
  const code = p.oem_codes?.[0]?.code
  if (!code) {
    add({
      severity: 'alta',
      area: 'códigos',
      partName: p.name_es,
      titleEs: 'Repuesto sin código',
      detailEs: 'No se puede cotizar con certeza: falta el código por VIN.',
    })
    continue
  }
  if (!byCode.has(code)) byCode.set(code, [])
  byCode.get(code).push(p)
}
for (const [code, list] of byCode) {
  if (list.length < 2) continue
  add({
    severity: 'media',
    area: 'códigos',
    partName: list.map((p) => p.name_es).join(' · '),
    titleEs: `Mismo código en ${list.length} repuestos`,
    detailEs: `Código ${code}. Puede ser una pieza simétrica (izquierda y derecha iguales) o un error de la planilla.`,
  })
}

// Datos de cotización sin confirmar y logística solo estimada.
const lineStats = suppliers.map((s) => {
  const ls = lines.filter((l) => l.supplier_id === s.id)
  return {
    supplier: supplierName(s),
    lines: ls.length,
    qualityUnconfirmed: ls.filter((l) => !l.confirmations?.part_type).length,
    currencyUnconfirmed: ls.filter((l) => !l.confirmations?.currency).length,
    incotermUnconfirmed: ls.filter((l) => !l.confirmations?.incoterm).length,
    hasAirportDistance: distanceOf(s).km != null,
    airportDistanceConfirmed: distanceOf(s).confirmed,
    formF: s.facts?.formF?.value ?? 'unknown',
    type: s.supplier_type ?? s.facts?.type?.value ?? null,
    verified: !!s.verified,
  }
})
for (const st of lineStats) {
  if (st.qualityUnconfirmed > 0) {
    add({
      severity: 'alta',
      area: 'cotización',
      supplier: st.supplier,
      titleEs: `Calidad sin confirmar en ${st.qualityUnconfirmed} líneas`,
      detailEs:
        'La cotización no dice si es OEM o AFM: la calidad es una estimación. Pedirla por escrito antes de comprar.',
    })
  }
  if (!st.hasAirportDistance) {
    add({
      severity: 'media',
      area: 'cotización',
      supplier: st.supplier,
      titleEs: 'Sin distancia al aeropuerto',
      detailEs:
        'El transporte en China se estima con el mayor entre 3 % del precio y la distancia promedio de los otros proveedores.',
    })
  }
  if (st.formF === 'unknown') {
    add({
      severity: 'media',
      area: 'cotización',
      supplier: st.supplier,
      titleEs: 'Sin confirmar si emite Formulario F',
      detailEs: 'Sin Formulario F se paga el arancel general de 6 % en vez del TLC.',
    })
  }
}
const usedRows = allLines.filter(
  (l) => l.source_raw?.col_I && /^used$/i.test(String(l.source_raw.col_I).trim()),
)
if (usedRows.length) {
  add({
    severity: 'media',
    area: 'cotización',
    supplier: 'Anhui Zuoheng',
    titleEs: `${usedRows.length} filas marcadas "Used" (repuesto usado)`,
    detailEs: 'No se cargaron como OEM ni AFM. Decidir si se quieren como tercera calidad.',
  })
}
const estimatedLogistics = parts.filter(
  (p) => !['supplier_confirmed', 'measured'].includes(p.logistics_status),
)
add({
  severity: 'alta',
  area: 'logística',
  titleEs: `Peso y volumen sin confirmar en ${estimatedLogistics.length} de ${parts.length} repuestos`,
  detailEs:
    'Son referencias de fichas de vendedores y piezas equivalentes. En avión el flete es lo que más pesa: pedir el packing list al proveedor elegido antes de cerrar el precio al cliente.',
})
for (const f of KNOWN_FINDINGS) add(f)

const severityRank = { alta: 0, media: 1, baja: 2 }
anomalies.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])

// ── Escenarios ──────────────────────────────────────────────────────────────────────────────────
const scenarios = SCENARIOS.map((sc) => {
  const offers = sc.rate === 1 && sc.vol === 1 ? baseOffers : buildOffers(sc)
  return { ...sc, results: analyzeScenario(offers, sc) }
})

// Cobertura y precios por proveedor (foto de las cotizaciones).
const coverage = suppliers.map((s) => ({
  supplier: supplierName(s),
  supplierId: s.id,
  original: new Set(
    baseOffers
      .filter((o) => o.supplierId === s.id && o.quality === 'original')
      .map((o) => o.partId),
  ).size,
  alternative: new Set(
    baseOffers
      .filter((o) => o.supplierId === s.id && o.quality === 'alternative')
      .map((o) => o.partId),
  ).size,
}))

const report = {
  generatedAt: new Date().toISOString(),
  vehicle: `${vehicleDoc.data().brand} ${vehicleDoc.data().shortModel}`,
  partCount: parts.length,
  fx: DEFAULT_FX,
  assumptions: {
    airUsdPerKg: DEFAULT_UNIT_COST_ASSUMPTIONS.airUsdPerKgCents / 100,
    airDivisor: DEFAULT_PARAM_SET.freightDefaults.airVolumetricDivisor,
    generalDutyPct: DEFAULT_UNIT_COST_ASSUMPTIONS.generalDutyBp / 100,
    focusMarginPct: FOCUS_MARGIN_BP / 100,
    marginsPct: MARGINS_BP.map((m) => m / 100),
    perShipmentUsd: perShipmentMicro / 1e6,
    agentMinUsd: AGENT_MIN / 1e6,
    oversizeCm: OVERSIZE_CM,
    topDemand: TOP_DEMAND,
    averageAirportKm: averageKm,
  },
  suppliers: suppliers.map((s) => ({ id: s.id, name: supplierName(s) })),
  supplierStats: lineStats,
  coverage,
  notWorthFlying,
  suspectOfferCount: suspectOffers.size,
  anomalies,
  scenarios,
}

if (OUT) fs.writeFileSync(OUT, JSON.stringify(report, null, 1))
if (HTML_OUT) {
  const template = fs.readFileSync(
    path.join(root, 'scripts/templates/air-trial-report.html'),
    'utf8',
  )
  // El JSON va dentro de un <script>: se escapa "<" para que ningún texto cierre la etiqueta.
  const json = JSON.stringify(report).replace(/</g, '\\u003c')
  fs.writeFileSync(
    HTML_OUT,
    template.replace('/*__DATA__*/ null', () => json),
  )
}

// ── Resumen en consola ──────────────────────────────────────────────────────────────────────────
const names = (ids) => ids.map((id) => sName.get(id)).join(' + ')
const clp = (n) => `CLP ${n.toLocaleString('es-CL')}`
console.log(
  `${report.vehicle}: ${parts.length} repuestos. Aéreo US$${report.assumptions.airUsdPerKg}/kg.`,
)
console.log(
  `Anomalías: ${anomalies.length} (${anomalies.filter((a) => a.severity === 'alta').length} altas). No conviene volar: ${notWorthFlying}.\n`,
)
for (const sc of scenarios.slice(0, 1)) {
  for (const q of QUALITIES) {
    for (const c of ['A', 'B', 'C']) {
      const r = sc.results[q][c]
      console.log(
        `[${QUALITY_ES[q]}] caso ${c}: ${r.parts} repuestos, base cliente ${clp(r.baselineClp)}`,
      )
      for (const b of r.best.slice(0, 4)) {
        console.log(
          `   ${names(b.supplierIds)}: cubre ${b.covered}/${r.parts}, costo ${clp(b.costClp)}, ahorro @15 % ${clp(b.savingsClp[FOCUS_MARGIN_BP])}`,
        )
      }
    }
  }
}
process.exit(0)
