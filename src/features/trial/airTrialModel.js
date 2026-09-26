// Compra de prueba por avión: costea cada oferta de los proveedores con el costo unitario del
// motor en modo aéreo, detecta anomalías en los datos y compara con qué proveedor quedarnos para
// cada opción que puede elegir el cliente (solo Original, o lo más barato de cada repuesto).
//
// Función pura: recibe repuestos, proveedores y supuestos, y devuelve el análisis completo. No usa
// el simulador de pedidos. Los gastos que se cobran por embarque (despacho, guía aérea, reparto y
// mínimos) no se prorratean entre piezas: se cobran una vez por cada proveedor que se use, porque
// cada proveedor despacha por separado. Todo el dinero va en micros de USD (enteros) y el CLP se
// obtiene solo para mostrar.
import { money, allocateByWeights } from '@libs/money'
import { toUsdMicro } from '@libs/fx'
import { computeUnitCost } from '@core/costing/unitCost'

/** Márgenes sobre el costo puesto en Chile, en basis points. */
export const MARGINS_BP = Array.from({ length: 5 }, (_, i) => i * 1000)
export const FOCUS_MARGIN_BP = 2000
export const TOP_DEMAND = 30
/** Un precio es atípico si pasa de 3 veces la mediana entre proveedores o queda bajo un tercio. */
const OUTLIER_FACTOR = 3
/** Por nombre: piezas que pueden ser mercancía peligrosa por avión. */
const DG_NAME = /compresor|bater[ií]a|airbag|pretensor|bolsa de aire|litio/i
/** Un bulto con un lado mayor a esto (cm) puede exigir avión de carga. */
const OVERSIZE_CM = 150
const MAX_COMBO = 2
/** Lo que elige el cliente: solo original, o lo más barato de cada repuesto sea cual sea su calidad. */
export const OPTIONS = ['original', 'cheapest']
export const QUALITY_ES = { original: 'OEM', alternative: 'AFM' }

/** Escenarios de sensibilidad: se cambia un supuesto a la vez, en basis points sobre el valor base. */
export const SCENARIOS = [
  { key: 'base', labelEs: 'Con los datos actuales', rateBp: 10000, volBp: 10000, qtyBp: 10000 },
  {
    key: 'rate_lo',
    labelEs: 'El flete sale 30 % más barato',
    rateBp: 7000,
    volBp: 10000,
    qtyBp: 10000,
  },
  {
    key: 'rate_hi',
    labelEs: 'El flete sale 30 % más caro',
    rateBp: 13000,
    volBp: 10000,
    qtyBp: 10000,
  },
  {
    key: 'vol_x2',
    labelEs: 'Los bultos ocupan el doble',
    rateBp: 10000,
    volBp: 20000,
    qtyBp: 10000,
  },
  {
    key: 'qty_25',
    labelEs: 'Se compra 25 % de las cantidades',
    rateBp: 10000,
    volBp: 10000,
    qtyBp: 2500,
  },
  {
    key: 'qty_10',
    labelEs: 'Se compra 10 % de las cantidades',
    rateBp: 10000,
    volBp: 10000,
    qtyBp: 1000,
  },
]

/** Qué hacer con cada tipo de anomalía; se elige por su código. */
const ACTIONS = {
  price_low:
    'Pedir al proveedor que confirme por escrito código, pieza completa y precio. Hasta entonces no se compra con ese precio.',
  price_high:
    'Confirmar unidad y moneda con el proveedor; si no se aclara, comprar la pieza a otro proveedor.',
  afm_above_oem:
    'Pedirle que confirme qué es cada precio; comprar la alternativa a otro proveedor.',
  dangerous_goods:
    'Pedir la hoja MSDS y consultar al forwarder antes de incluirla; si no puede volar, enviarla por mar.',
  same_code:
    'Preguntar al proveedor si son piezas simétricas; si no lo son, pedir el código de cada una.',
}

const median = (nums) => {
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}
const bpOf = (value, bp) => Math.round((value * bp) / 10000)
/** Micros de USD a centavos, para mostrar. */
const centsOf = (micro) => Math.round(micro / 10_000)

/** Los gastos por embarque no van en el costo de la pieza: se cobran una vez por proveedor. */
const PER_SHIPMENT_NOTE =
  'Los gastos que se cobran por embarque (despacho, manipulación, guía aérea) no se reparten entre piezas: se cobran una sola vez por proveedor, en el paso 2.'

/** Componentes del costo unitario que se suman (el resto, como CIF, son subtotales). */
const UNIT_LINES = [
  'price',
  'origin',
  'originCharges',
  'freight',
  'insurance',
  'duty',
  'localCosts',
  'bank',
]

/**
 * Reparte un total en centavos entre las líneas que lo suman, con el método del resto mayor: lo
 * que se muestra suma exacto, sin diferencia de redondeo.
 * @param {number} totalMicro
 * @param {Array<{ labelEs: string, usdMicro: number }>} lines
 */
function withCents(totalMicro, lines) {
  const cents = allocateByWeights(
    centsOf(totalMicro),
    lines.map((l) => l.usdMicro),
  )
  return lines.map((l, i) => ({ ...l, cents: cents[i] }))
}

/** Sigla para las tablas: "XM Industrial" ya empieza con la suya; el resto, las iniciales. */
export function supplierAbbr(name) {
  const first = name.split(' ')[0]
  if (/^[A-Z]{2,4}$/.test(first)) return first
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/**
 * @param {Object} input
 * @param {any[]} input.parts       Repuestos del vehículo en sourcing, con `quotes`.
 * @param {any[]} input.suppliers   Proveedores (`alias`, `name`, `facts`).
 * @param {(supplierId: string) => any} input.settingsFor  Distancia y supuesto de origen de cada proveedor.
 * @param {any} input.rates         Supuestos de costo unitario (tarifa aérea, gastos por embarque).
 * @param {any} input.params        Set de parámetros fiscales.
 * @param {any} input.fx
 * @param {number} [input.focusMarginBp]  Margen con el que se ordena y se resume el ahorro; el aéreo global.
 */
export function buildAirTrial({
  parts,
  suppliers,
  settingsFor,
  rates,
  params,
  fx,
  focusMarginBp = FOCUS_MARGIN_BP,
}) {
  const margins = [...new Set([...MARGINS_BP, focusMarginBp])].sort((a, b) => a - b)
  const partById = new Map(parts.map((p) => [p.id, p]))
  const nameOf = new Map(suppliers.map((s) => [s.id, s.alias || s.name]))
  const abbrOf = new Map([...nameOf].map(([id, name]) => [id, supplierAbbr(name)]))

  // Un pesos chileno entero desde micros de USD, sin pasar por decimales flotantes.
  const clpPerUsdMicro = BigInt(fx.usdClp)
  const clpOf = (usdMicro) =>
    Number((BigInt(Math.round(usdMicro)) * clpPerUsdMicro + 500_000_000_000n) / 1_000_000_000_000n)
  const baselineOf = (p) => p.baselinePrice?.amount ?? null
  const scaledQty = (p, qtyBp) => Math.max(1, bpOf(p.quantityEstimated ?? 1, qtyBp))

  // Gastos por embarque de la lista de referencia, en modo aéreo.
  const airCharges = rates.shipmentCharges.filter((c) => c.modes.includes('air'))
  const isShipmentFee = (c) => c.basis === 'per_shipment' || c.basis === 'percent_plus_fixed'
  const perShipmentMicro = airCharges.reduce(
    (sum, c) => sum + (isShipmentFee(c) ? c.amountCents * 10_000 : 0),
    0,
  )
  const minOf = (code) => (airCharges.find((c) => c.code === code)?.minCents ?? 0) * 10_000
  const agentMin = minOf('customs_agent')
  const inlandMin = minOf('inland_china')
  const insuranceMin = params.insurance.minPremium.amount * 10_000
  /** Gastos por embarque en cero: el costo unitario queda con lo que escala con la pieza. */
  const variableCharges = rates.shipmentCharges.map((c) => ({
    ...c,
    amountCents: isShipmentFee(c) ? 0 : c.amountCents,
    minCents: c.minCents == null ? c.minCents : 0,
  }))

  const distances = suppliers.map((s) => settingsFor(s.id))

  // Una oferta por repuesto × proveedor × calidad: la de menor precio, sin las inferidas.
  const cheapestLines = new Map()
  for (const p of parts) {
    for (const q of p.quotes ?? []) {
      if (q.inferred || !q.currency || !nameOf.has(q.supplierId)) continue
      const key = `${p.id}|${q.supplierId}|${q.partType}`
      const usdMicro = toUsdMicro(q.price, fx)
      const prev = cheapestLines.get(key)
      if (!prev || usdMicro < prev.usdMicro) cheapestLines.set(key, { part: p, q, usdMicro })
    }
  }

  function buildOffers({ rateBp, volBp }) {
    const assumptions = {
      ...rates,
      airUsdPerKgCents: bpOf(rates.airUsdPerKgCents, rateBp),
      shipmentCharges: variableCharges,
    }
    const offers = []
    for (const { part: p, q, usdMicro } of cheapestLines.values()) {
      if (!(p.weightG > 0) || !(p.volumeCm3 > 0)) continue
      const settings = settingsFor(q.supplierId)
      const supplier = suppliers.find((s) => s.id === q.supplierId)
      const unit = computeUnitCost({
        unitPrice: money(q.price.amount, q.price.currency),
        incoterm: q.incoterm ?? null,
        originDistanceKm: settings.originDistanceKm,
        originDistanceConfirmed: settings.originDistanceConfirmed,
        originFallback: settings.originFallback,
        formF: supplier?.facts?.formF?.value ?? 'unknown',
        weightG: p.weightG,
        volumeCm3: bpOf(p.volumeCm3, volBp),
        logisticsConfirmed: false,
        mode: 'air',
        assumptions,
        params,
        fx,
      })
      if (unit.landedNetUsdMicro == null) continue
      const comp = (code) => unit.components.find((c) => c.code === code)
      const item = (code, itemCode) =>
        comp(code)?.items?.find((i) => i.code === itemCode)?.usdMicro ?? 0
      offers.push({
        partId: p.id,
        supplierId: q.supplierId,
        quality: q.partType,
        qualityConfirmed: q.partTypeConfirmed,
        priceUsdMicro: usdMicro,
        landedUsdMicro: unit.landedNetUsdMicro, // sin gastos por embarque
        components: unit.components,
        freightMicro: comp('freight').usdMicro,
        fobMicro: comp('price').usdMicro + comp('origin').usdMicro + comp('originCharges').usdMicro,
        volumeCm3: bpOf(p.volumeCm3, volBp),
        agentMicro: item('localCosts', 'customs_agent'),
        inlandMicro: item('origin', 'inland_china'),
        insuranceMicro: comp('insurance').usdMicro,
        chargeableKg: Math.max(p.weightG / 1000, bpOf(p.volumeCm3, volBp) / 6000),
      })
    }
    return offers
  }

  // Costo de un reparto: variable más los gastos por embarque de cada proveedor usado.
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
    const shipmentLines = airCharges
      .filter(isShipmentFee)
      .map((c) => ({ labelEs: c.labelEs, usdMicro: c.amountCents * 10_000 }))
    for (const [supplierId, g] of bySupplier) {
      // Los mínimos por embarque solo suman lo que falta para llegar al mínimo.
      const topUps =
        Math.max(0, agentMin - g.agent) +
        Math.max(0, inlandMin - g.inland) +
        Math.max(0, insuranceMin - g.ins)
      const fixed = perShipmentMicro + topUps
      total += g.variable + fixed
      const topUpLines = [
        ['Completar el mínimo del agente de aduanas', Math.max(0, agentMin - g.agent)],
        ['Completar el mínimo del transporte en China', Math.max(0, inlandMin - g.inland)],
        ['Completar la prima mínima del seguro', Math.max(0, insuranceMin - g.ins)],
      ]
        .filter(([, usdMicro]) => usdMicro > 0)
        .map(([labelEs, usdMicro]) => ({ labelEs, usdMicro }))
      perSupplier.push({
        supplierId,
        variable: g.variable,
        fixed,
        kg: g.kg,
        lines: [
          { labelEs: 'Costo de las piezas puestas en Chile', usdMicro: g.variable },
          ...shipmentLines,
          ...topUpLines,
        ],
      })
    }
    return { totalUsdMicro: total, perSupplier }
  }

  function subsets(ids) {
    const out = []
    const rec = (start, cur) => {
      if (cur.length > 0) out.push([...cur])
      if (cur.length === MAX_COMBO) return
      for (let i = start; i < ids.length; i++) rec(i + 1, [...cur, ids[i]])
    }
    rec(0, [])
    return out
  }

  /** Reparto entre un conjunto de proveedores: cada repuesto al de menor costo variable. */
  function evaluateSet(setIds, offersByPart, partList, qtyBp) {
    const assigned = []
    let baseline = 0
    for (const p of partList) {
      const options = (offersByPart.get(p.id) ?? []).filter((o) => setIds.includes(o.supplierId))
      if (!options.length) continue
      options.sort((a, b) => a.landedUsdMicro - b.landedUsdMicro)
      const qty = scaledQty(p, qtyBp)
      assigned.push({ offer: options[0], qty, part: p })
      baseline += (baselineOf(p) ?? 0) * qty
    }
    const cost = costAssignments(assigned)
    const costClp = clpOf(cost.totalUsdMicro)
    const sumOver = (pick) => assigned.reduce((sum, a) => sum + pick(a.offer) * a.qty, 0)
    return {
      supplierIds: setIds,
      covered: assigned.length,
      units: assigned.reduce((sum, a) => sum + a.qty, 0),
      volumeCm3: sumOver((o) => o.volumeCm3),
      freightUsdMicro: sumOver((o) => o.freightMicro),
      fobUsdMicro: sumOver((o) => o.fobMicro),
      baselineClp: baseline,
      costClp,
      kg: Math.round(cost.perSupplier.reduce((s, x) => s + x.kg, 0) * 10) / 10,
      savingsClp: Object.fromEntries(margins.map((m) => [m, baseline - bpOf(costClp, 10000 + m)])),
      estimatedQualityLines: assigned.filter((a) => !a.offer.qualityConfirmed).length,
      calc: cost.perSupplier.map((x) => ({
        supplierId: x.supplierId,
        kg: Math.round(x.kg * 10) / 10,
        totalUsdMicro: x.variable + x.fixed,
        lines: withCents(x.variable + x.fixed, x.lines),
      })),
      items: assigned.map((a) => ({
        partId: a.part.id,
        name: a.part.nameEs,
        supplierId: a.offer.supplierId,
        quality: QUALITY_ES[a.offer.quality],
        qty: a.qty,
        unitCostClp: clpOf(a.offer.landedUsdMicro),
        unitCostUsdMicro: a.offer.landedUsdMicro,
        chargeableKg: Math.round(a.offer.chargeableKg * 1000) / 1000,
        breakdown: withCents(
          a.offer.landedUsdMicro,
          UNIT_LINES.map((code) => a.offer.components.find((c) => c.code === code)).map((c) => ({
            labelEs: c.labelEs,
            formulaEs:
              c.code === 'originCharges'
                ? PER_SHIPMENT_NOTE
                : c.formulaEs + (c.code === 'localCosts' ? ` ${PER_SHIPMENT_NOTE}` : ''),
            usdMicro: c.usdMicro,
          })),
        ),
        unitBaselineClp: baselineOf(a.part),
      })),
    }
  }

  const supplierIds = suppliers.map((s) => s.id)
  const anomalies = []
  const suspectOffers = new Set()
  const baseOffers = buildOffers(SCENARIOS[0])

  // ── Anomalías ───────────────────────────────────────────────────────────────────────────────
  const groups = new Map()
  for (const o of baseOffers) {
    const k = `${o.partId}|${o.quality}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(o)
  }
  for (const list of groups.values()) {
    if (list.length < 3) continue
    const med = median(list.map((o) => o.priceUsdMicro))
    for (const o of list) {
      const low = o.priceUsdMicro * OUTLIER_FACTOR < med
      if (!low && !(o.priceUsdMicro > med * OUTLIER_FACTOR)) continue
      suspectOffers.add(`${o.partId}|${o.supplierId}|${o.quality}`)
      anomalies.push({
        code: low ? 'price_low' : 'price_high',
        severity: low ? 'alta' : 'media',
        area: 'precio',
        partName: partById.get(o.partId).nameEs,
        supplierId: o.supplierId,
        quality: QUALITY_ES[o.quality],
        titleEs: `${low ? 'Precio muy bajo' : 'Precio muy alto'} frente a los otros proveedores`,
        detailEs: `US$ ${(o.priceUsdMicro / 1e6).toFixed(2)} contra una mediana de US$ ${(med / 1e6).toFixed(2)} entre ${list.length} proveedores. ${low ? 'Puede ser otra pieza, una parte suelta o un error de cotización.' : 'Puede ser un error de unidad o de moneda.'}`,
        actionEs: ACTIONS[low ? 'price_low' : 'price_high'],
      })
    }
  }
  for (const p of parts) {
    for (const s of suppliers) {
      const find = (quality) =>
        baseOffers.find((o) => o.partId === p.id && o.supplierId === s.id && o.quality === quality)
      const oem = find('original')
      const afm = find('alternative')
      if (oem && afm && afm.priceUsdMicro > oem.priceUsdMicro) {
        anomalies.push({
          code: 'afm_above_oem',
          severity: 'media',
          area: 'precio',
          partName: p.nameEs,
          supplierId: s.id,
          quality: 'AFM',
          titleEs: 'La alternativa cuesta más que el original',
          detailEs: `AFM US$ ${(afm.priceUsdMicro / 1e6).toFixed(2)} contra OEM US$ ${(oem.priceUsdMicro / 1e6).toFixed(2)} del mismo proveedor.`,
          actionEs: ACTIONS.afm_above_oem,
        })
      }
    }
  }
  for (const p of parts) {
    if (!DG_NAME.test(p.nameEs)) continue
    anomalies.push({
      code: 'dangerous_goods',
      severity: 'alta',
      area: 'logística',
      partName: p.nameEs,
      titleEs: 'Posible mercancía peligrosa por avión',
      detailEs: 'Pedir la hoja MSDS y confirmar con el forwarder antes de incluirla en el pedido.',
      actionEs: ACTIONS.dangerous_goods,
    })
  }
  // Mismo código en piezas distintas: izquierda y derecha, o delantera y trasera, puede ser normal.
  const byCode = new Map()
  const missingCodes = []
  for (const p of parts) {
    if (!p.code) {
      missingCodes.push(p.nameEs)
      continue
    }
    if (!byCode.has(p.code)) byCode.set(p.code, [])
    byCode.get(p.code).push(p)
  }
  const bare = (n) =>
    n
      .replace(/\b(DER|IZQ|DEL|TRAS)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  for (const [code, list] of byCode) {
    if (list.length < 2 || new Set(list.map((x) => bare(x.nameEs))).size === 1) continue
    anomalies.push({
      code: 'same_code',
      severity: 'media',
      area: 'códigos',
      partName: list.map((x) => x.nameEs).join(' · '),
      titleEs: `Mismo código en ${list.length} repuestos`,
      detailEs: `Código ${code}. Son piezas distintas con el mismo código: puede ser un error de la planilla.`,
      actionEs: ACTIONS.same_code,
    })
  }
  // Hallazgos de la investigación de códigos y nombres que no salen de un cálculo.
  anomalies.push(
    {
      code: 'names_swapped',
      severity: 'alta',
      area: 'nombres',
      titleEs: 'Tapabarro y Guardafango con la traducción al inglés cruzada',
      detailEs:
        'Un proveedor puede haber cotizado la pieza equivocada. Confirmar con foto o dibujo antes de pagar.',
      actionEs: 'Pedir al proveedor una foto de la pieza cotizada antes de pagar.',
    },
    {
      code: 'tail_lamp_name',
      severity: 'alta',
      area: 'nombres',
      titleEs: '"Reflector Portalón" son focos traseros interiores',
      detailEs: 'El nombre del cliente no describe la pieza; confirmar cuál se quiere.',
      actionEs: 'Confirmar con el cliente qué pieza quiere y cotizarla con foto.',
    },
    {
      code: 'disc_code',
      severity: 'media',
      area: 'códigos',
      titleEs: 'Disco de freno trasero: 4581005 frente a 4551007 del cliente',
      detailEs: 'Dos códigos posibles; el proveedor debe confirmar el que corresponde al VIN.',
      actionEs: 'Pedir al proveedor que confirme el código correcto con el VIN.',
    },
  )
  anomalies.sort((a, b) => (a.severity === 'alta' ? 0 : 1) - (b.severity === 'alta' ? 0 : 1))

  // ── Datos que faltan: no son anomalías, son cosas por pedir ─────────────────────────────────
  const missingData = []
  const gap = (titleEs, actionEs) => missingData.push({ titleEs, actionEs })
  for (const s of suppliers) {
    const own = parts
      .flatMap((p) => p.quotes ?? [])
      .filter((q) => q.supplierId === s.id && !q.inferred)
    const unconfirmed = own.filter((q) => !q.partTypeConfirmed).length
    if (unconfirmed > 0) {
      gap(
        `${abbrOf.get(s.id)}: la cotización no dice la calidad de ${unconfirmed} líneas`,
        'Pedir por escrito si cada línea es OEM o AFM. Hasta entonces no se ofrece como original.',
      )
    }
    if (settingsFor(s.id).originDistanceKm == null) {
      gap(
        `${abbrOf.get(s.id)}: falta el aeropuerto de despacho`,
        'Preguntarlo y cargarlo en su ficha; mientras, el transporte en China usa la distancia promedio.',
      )
    }
  }
  if (suppliers.every((s) => !s.facts?.formF?.value)) {
    gap(
      'Ningún proveedor confirmó si emite Formulario F',
      'Preguntar por proveedor y partidas: con él baja el arancel general.',
    )
  }
  if (missingCodes.length) {
    gap(
      `${missingCodes.length} repuestos sin código: ${missingCodes.join(', ')}`,
      'Pedir el código por VIN al proveedor elegido, con foto del despiece.',
    )
  }
  const unmeasured = parts.filter(
    (p) => !['supplier_confirmed', 'measured'].includes(p.logisticsStatus),
  ).length
  gap(
    `Peso y volumen sin confirmar en ${unmeasured} de ${parts.length} repuestos`,
    'Pedir el packing list al proveedor elegido antes de fijar el precio al cliente.',
  )
  gap(
    'Flete aéreo sin cotización de forwarder',
    'Cotizarlo con un forwarder real: hoy es una referencia publicada.',
  )
  if (parts.some((p) => DG_NAME.test(p.nameEs))) {
    gap('Hoja MSDS del compresor', 'Pedirla y consultar al forwarder si puede ir por avión.')
  }

  // ── Escenarios ──────────────────────────────────────────────────────────────────────────────
  const isOversize = (p) => Array.isArray(p.packageCm) && Math.max(...p.packageCm) >= OVERSIZE_CM
  // Piezas que no entran a la compra aérea, por mercancía peligrosa o por tamaño.
  const dgIds = new Set(
    parts.filter((p) => DG_NAME.test(p.nameEs) || isOversize(p)).map((p) => p.id),
  )
  function analyze(offers, scenario) {
    const usable = offers.filter(
      (o) => !suspectOffers.has(`${o.partId}|${o.supplierId}|${o.quality}`),
    )
    const out = {}
    for (const option of OPTIONS) {
      let optionOffers = usable.filter((o) => o.quality === option)
      if (option === 'cheapest') {
        // Por repuesto y proveedor, la calidad que salga más barata.
        const min = new Map()
        for (const o of usable) {
          const k = `${o.partId}|${o.supplierId}`
          if (!min.has(k) || o.landedUsdMicro < min.get(k).landedUsdMicro) min.set(k, o)
        }
        optionOffers = [...min.values()]
      }
      const offersByPart = new Map()
      for (const o of optionOffers) {
        if (!offersByPart.has(o.partId)) offersByPart.set(o.partId, [])
        offersByPart.get(o.partId).push(o)
      }
      const cases = {
        // A: todos los repuestos. B: solo los que conviene volar. C: los de más demanda.
        A: parts,
        B: parts.filter((p) => {
          if (dgIds.has(p.id) || baselineOf(p) == null) return false
          const best = Math.min(...(offersByPart.get(p.id) ?? []).map((o) => o.landedUsdMicro))
          return Number.isFinite(best) && clpOf(best) < baselineOf(p)
        }),
        C: parts
          .filter((p) => baselineOf(p) != null)
          .sort((a, b) => baselineOf(b) * scaledQty(b, 10000) - baselineOf(a) * scaledQty(a, 10000))
          .slice(0, TOP_DEMAND),
      }
      out[option] = {}
      for (const [caseKey, list] of Object.entries(cases)) {
        const results = subsets(supplierIds)
          .map((set) => evaluateSet(set, offersByPart, list, scenario.qtyBp))
          .filter((r) => r.covered > 0)
          .sort((a, b) => b.savingsClp[focusMarginBp] - a.savingsClp[focusMarginBp])
        // El detalle por repuesto solo se guarda para lo que se compra; en el resto pesa de más.
        if (!(caseKey === 'B' && scenario.key === 'base'))
          for (const r of results) {
            delete r.items
            delete r.calc
          }
        out[option][caseKey] = {
          parts: list.length,
          single: results.filter((r) => r.supplierIds.length === 1),
          pair: results.find((r) => r.supplierIds.length === 2) ?? null,
        }
      }
    }
    return out
  }

  const scenarios = SCENARIOS.map((sc) => ({
    ...sc,
    results: analyze(sc.key === 'base' ? baseOffers : buildOffers(sc), sc),
  }))

  const notWorthFlying = parts.filter((p) => {
    const costs = baseOffers.filter((o) => o.partId === p.id).map((o) => o.landedUsdMicro)
    return baselineOf(p) != null && costs.length > 0 && clpOf(Math.min(...costs)) > baselineOf(p)
  }).length

  // ── Decisión logística: piezas que quedan fuera del pedido aéreo, y por qué ─────────────────
  const logistics = []
  for (const p of parts) {
    const costs = baseOffers.filter((o) => o.partId === p.id)
    const best = costs.length
      ? costs.reduce((a, b) => (b.landedUsdMicro < a.landedUsdMicro ? b : a))
      : null
    const reasons = []
    if (best && baselineOf(p) != null && clpOf(best.landedUsdMicro) > baselineOf(p)) {
      reasons.push('Cuesta más que lo que paga hoy el cliente')
    }
    if (isOversize(p))
      reasons.push(`Bulto de ${p.packageCm.join(' × ')} cm: puede exigir avión de carga`)
    if (DG_NAME.test(p.nameEs)) reasons.push('Posible mercancía peligrosa')
    if (!reasons.length) continue
    logistics.push({
      partId: p.id,
      name: p.nameEs,
      reasons,
      kg: best ? Math.round(best.chargeableKg * 10) / 10 : null,
      costClp: best ? clpOf(best.landedUsdMicro) : null,
      baselineClp: baselineOf(p),
      demandClp: baselineOf(p) == null ? 0 : baselineOf(p) * (p.quantityEstimated ?? 1),
    })
  }
  logistics.sort((a, b) => b.demandClp - a.demandClp)

  // Mejor costo unitario en Chile por repuesto y calidad, sin gastos por embarque y sin ofertas
  // atípicas: sirve para calcular un precio de venta por repuesto.
  const partCosts = {}
  for (const o of baseOffers) {
    if (suspectOffers.has(`${o.partId}|${o.supplierId}|${o.quality}`)) continue
    const byQuality = (partCosts[o.partId] ??= {})
    const prev = byQuality[o.quality]
    if (!prev || o.landedUsdMicro < prev.usdMicro) {
      byQuality[o.quality] = { usdMicro: o.landedUsdMicro, supplierId: o.supplierId }
    }
  }
  for (const byQuality of Object.values(partCosts)) {
    for (const q of Object.keys(byQuality)) {
      byQuality[q] = { costClp: clpOf(byQuality[q].usdMicro), supplierId: byQuality[q].supplierId }
    }
  }

  const known = distances.map((d) => d.originDistanceKm).filter((k) => k != null)
  return {
    partCount: parts.length,
    focusMarginBp,
    marginsBp: margins,
    suppliers: suppliers.map((s) => ({ id: s.id, name: nameOf.get(s.id), abbr: abbrOf.get(s.id) })),
    assumptions: {
      airUsdPerKgCents: rates.airUsdPerKgCents,
      airDivisor: params.freightDefaults.airVolumetricDivisor,
      generalDutyBp: rates.generalDutyBp,
      perShipmentUsdCents: Math.round(perShipmentMicro / 10_000),
      averageAirportKm: known.length ? known.reduce((a, b) => a + b, 0) / known.length : null,
      usdClp: Math.round(fx.usdClp / 1e6),
      fxAsOf: fx.asOf,
    },
    notWorthFlying,
    logistics,
    suspectOfferCount: suspectOffers.size,
    suspectOfferKeys: [...suspectOffers],
    missingData,
    anomalies,
    scenarios,
    partCosts,
  }
}

/** Por qué un repuesto queda fuera del pedido aéreo (según el texto del motivo). */
export const EXCLUDED_KINDS = Object.freeze({ PRICE: 'price', SIZE: 'size', DG: 'dg' })
const kindOfReason = (reason) =>
  /Cuesta más/.test(reason)
    ? EXCLUDED_KINDS.PRICE
    : /Bulto/.test(reason)
      ? EXCLUDED_KINDS.SIZE
      : /peligrosa/.test(reason)
        ? EXCLUDED_KINDS.DG
        : null

/**
 * Qué tanto más caro sale volar cada repuesto que queda fuera del pedido aéreo, para justificar
 * por qué se omite. Función pura sobre `logistics` del análisis. Por repuesto: unidades estimadas
 * (demanda ÷ precio de hoy), diferencia con lo que paga hoy el cliente (pesos y basis points) y
 * sobrecosto total si se volara (solo cuando cuesta más). Ordenado por sobrecosto y luego por
 * demanda.
 *
 * @param {Array<{ partId: string, name: string, reasons: string[], kg: number|null, costClp: number|null, baselineClp: number|null, demandClp: number }>} logistics
 */
export function summarizeExcluded(logistics) {
  const rows = logistics.map((l) => {
    const hasBaseline = l.baselineClp != null && l.baselineClp > 0
    const qty = hasBaseline ? Math.round(l.demandClp / l.baselineClp) : 1
    const diffClp = hasBaseline && l.costClp != null ? l.costClp - l.baselineClp : null
    return {
      ...l,
      qty,
      kinds: [...new Set(l.reasons.map(kindOfReason).filter(Boolean))],
      diffClp,
      diffBp: diffClp == null ? null : Math.round((diffClp * 10000) / l.baselineClp),
      extraClp: diffClp != null && diffClp > 0 ? diffClp * qty : 0,
    }
  })
  rows.sort((a, b) => b.extraClp - a.extraClp || b.demandClp - a.demandClp)

  const ofKind = (kind) => rows.filter((r) => r.kinds.includes(kind))
  const price = ofKind(EXCLUDED_KINDS.PRICE)
  const bps = price
    .map((r) => r.diffBp)
    .filter((v) => v != null)
    .sort((a, b) => a - b)
  return {
    rows,
    price: {
      count: price.length,
      extraClp: price.reduce((sum, r) => sum + r.extraClp, 0),
      medianBp: bps.length ? bps[Math.floor(bps.length / 2)] : null,
    },
    size: {
      count: ofKind(EXCLUDED_KINDS.SIZE).length,
      kg: ofKind(EXCLUDED_KINDS.SIZE).reduce((sum, r) => sum + (r.kg ?? 0), 0),
    },
    dg: { count: ofKind(EXCLUDED_KINDS.DG).length },
  }
}
