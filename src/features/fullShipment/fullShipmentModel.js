// Carga completa por contenedor (FCL): el mismo tipo de análisis que la Compra de prueba
// (src/features/trial/airTrialModel.js), pero con las cantidades reales que estima la demanda
// de Tucar (`quantityEstimated` de cada repuesto) en vez de 1 unidad por línea, y costeando con
// el motor de contenedor completo (`planPurchase`/`costShipment`) en vez de un prorrateo manual
// de gastos por embarque — ese motor ya resuelve cuántos contenedores hacen falta para el pedido
// consolidado. Función pura: recibe repuestos, proveedores y supuestos, y devuelve el análisis.
import { planPurchase } from '@core/costing/purchasePlan'
import { toUsdMicro, usdMicroToClp } from '@libs/fx'
import { salePrice } from '@features/costing/pricingModel'

export const SHIPMENT_OPTIONS = ['original', 'cheapest']
export const SHIPMENT_OPTION_LABELS_ES = { original: 'Original', cheapest: 'Más barato' }
export const QUALITY_ES = { original: 'OEM', alternative: 'AFM' }

/** Un solo proveedor (sin los gastos fijos de sumar otro) o la mejor combinación, aunque sea de varios. */
export const SUPPLIER_MODES = ['single', 'multiple']
export const SUPPLIER_MODE_LABELS_ES = { single: 'Proveedor único', multiple: 'Varios proveedores' }

/** Gana el que cubre más repuestos; a igual cobertura, el más barato puesto en Chile. */
function betterScenario(a, b) {
  if (!b) return true
  if (a.coveredPartIds.length !== b.coveredPartIds.length) {
    return a.coveredPartIds.length > b.coveredPartIds.length
  }
  return (a.cost.totals.landedNet ?? Infinity) < (b.cost.totals.landedNet ?? Infinity)
}

/** La tarifa de flete por contenedor es el supuesto más volátil del cálculo. */
export const FREIGHT_SENSITIVITY = [
  { key: 'rate_lo', labelEs: 'El flete sale 30 % más barato', rateBp: 7000 },
  { key: 'base', labelEs: 'Con la tarifa actual', rateBp: 10000 },
  { key: 'rate_hi', labelEs: 'El flete sale 30 % más caro', rateBp: 13000 },
]

/** Sigla para las tablas: "XM Industrial" ya empieza con la suya; el resto, las iniciales. */
function supplierAbbr(name) {
  const first = name.split(' ')[0]
  if (/^[A-Z]{2,4}$/.test(first)) return first
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/** Un precio es atípico si pasa de 3 veces la mediana entre proveedores o queda bajo un tercio. */
const OUTLIER_FACTOR = 3
const median = (nums) => {
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}

/**
 * Anomalías de datos entre cotizaciones — no depende del modo de envío, por eso es casi la misma
 * lógica que usa la Compra de prueba (ver airTrialModel.js), reescrita acá para no acoplar esta
 * página al modelo aéreo. Devuelve también las ofertas sospechosas, para no usarlas en el costeo.
 * @param {{ offers: any[], parts: any[], suppliers: any[] }} input
 */
function detectAnomalies({ offers, parts, suppliers }) {
  const partById = new Map(parts.map((p) => [p.id, p]))
  const anomalies = []
  const suspect = new Set()

  const byPartQuality = new Map()
  for (const o of offers) {
    const k = `${o.partId}|${o.quality}`
    if (!byPartQuality.has(k)) byPartQuality.set(k, [])
    byPartQuality.get(k).push(o)
  }
  for (const list of byPartQuality.values()) {
    if (list.length < 3) continue
    const med = median(list.map((o) => o.priceUsdMicro))
    for (const o of list) {
      const low = o.priceUsdMicro * OUTLIER_FACTOR < med
      if (!low && !(o.priceUsdMicro > med * OUTLIER_FACTOR)) continue
      suspect.add(`${o.partId}|${o.supplierId}|${o.quality}`)
      anomalies.push({
        code: low ? 'price_low' : 'price_high',
        severity: low ? 'alta' : 'media',
        area: 'precio',
        partName: partById.get(o.partId)?.nameEs,
        supplierId: o.supplierId,
        quality: QUALITY_ES[o.quality],
        titleEs: `${low ? 'Precio muy bajo' : 'Precio muy alto'} frente a los otros proveedores`,
        detailEs: `US$ ${(o.priceUsdMicro / 1e6).toFixed(2)} contra una mediana de US$ ${(med / 1e6).toFixed(2)} entre ${list.length} proveedores. ${low ? 'Puede ser otra pieza, una parte suelta o un error de cotización.' : 'Puede ser un error de unidad o de moneda.'}`,
        actionEs: low
          ? 'Pedir al proveedor que confirme por escrito código, pieza completa y precio. Hasta entonces no se compra con ese precio.'
          : 'Confirmar unidad y moneda con el proveedor; si no se aclara, comprar la pieza a otro proveedor.',
      })
    }
  }

  for (const p of parts) {
    for (const s of suppliers) {
      const find = (quality) =>
        offers.find((o) => o.partId === p.id && o.supplierId === s.id && o.quality === quality)
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
          actionEs:
            'Pedirle que confirme qué es cada precio; comprar la alternativa a otro proveedor.',
        })
      }
    }
  }

  const byCode = new Map()
  for (const p of parts) {
    if (!p.code) continue
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
      actionEs:
        'Preguntar al proveedor si son piezas simétricas; si no lo son, pedir el código de cada una.',
    })
  }

  anomalies.sort((a, b) => (a.severity === 'alta' ? 0 : 1) - (b.severity === 'alta' ? 0 : 1))
  return { anomalies, suspect }
}

/**
 * @param {Object} input
 * @param {any[]} input.parts       Repuestos del vehículo en sourcing, con `quotes` y `quantityEstimated`.
 * @param {any[]} input.suppliers   Proveedores (`alias`, `name`, `facts`).
 * @param {(supplierId: string) => any} input.settingsFor  Distancia al puerto de cada proveedor (marítima).
 * @param {any} input.rates         Supuestos de costo unitario (`fclContainers`, gastos por embarque, aranceles).
 * @param {any} input.params        Set de parámetros fiscales.
 * @param {any} input.fx
 * @param {{ minMarginBp: number, maxSavingOemBp: number, maxSavingAltBp: number, minSavingBp: number }} input.pricing
 * @param {'sea_fcl_20'|'sea_fcl_40hq'} input.mode
 * @param {'single'|'multiple'} [input.supplierMode]  'single': el mejor proveedor solo, sin sumar
 *   los gastos fijos de combinar otro. 'multiple' (por defecto): la mejor combinación, sea de uno o varios.
 */
export function buildFullShipment({
  parts,
  suppliers,
  settingsFor,
  rates,
  params,
  fx,
  pricing,
  mode,
  supplierMode = 'multiple',
}) {
  const partById = new Map(parts.map((p) => [p.id, p]))
  const nameOf = new Map(suppliers.map((s) => [s.id, s.alias || s.name]))
  const abbrOf = new Map([...nameOf].map(([id, name]) => [id, supplierAbbr(name)]))

  const usableParts = parts.filter((p) => p.weightG > 0 && p.volumeCm3 > 0)
  const planParts = usableParts.map((p) => ({
    partId: p.id,
    qty: Math.max(1, Math.round(p.quantityEstimated ?? 1)),
    weightG: p.weightG,
    volumeCm3: p.volumeCm3,
    dgProfile: p.dgProfile ?? undefined,
  }))

  // Una oferta por línea de cotización real (sin las inferidas: son del lado opuesto de la pieza).
  // `toUsdMicro` solo entiende USD y CNY: una cotización en otra moneda (o mal cargada) se omite
  // en vez de romper toda la página — no es un dato que se pueda costear todavía.
  const allOffers = []
  for (const p of usableParts) {
    for (const q of p.quotes ?? []) {
      if (q.inferred || !q.currency || !nameOf.has(q.supplierId) || !q.incoterm || !q.price)
        continue
      let priceUsdMicro
      try {
        priceUsdMicro = toUsdMicro(q.price, fx)
      } catch {
        continue
      }
      allOffers.push({
        offerId: q.id,
        partId: p.id,
        supplierId: q.supplierId,
        quality: q.partType,
        qualityConfirmed: q.partTypeConfirmed,
        priceUsdMicro,
        unitPrice: { amount: q.price.amount, currency: q.currency, scale: q.price.scale },
        incoterm: q.incoterm,
      })
    }
  }

  const { anomalies, suspect } = detectAnomalies({
    offers: allOffers,
    parts: usableParts,
    suppliers,
  })
  const offers = allOffers.filter((o) => !suspect.has(`${o.partId}|${o.supplierId}|${o.quality}`))

  const planSuppliers = suppliers.map((s) => {
    const settings = settingsFor(s.id)
    return {
      id: s.id,
      originDistanceKm: settings.originDistanceKm,
      originFallback: settings.originFallback,
      formF: s.facts?.formF?.value ?? 'unknown',
    }
  })

  function runOption(option, assumptions = rates) {
    const optOffers =
      option === 'original' ? offers.filter((o) => o.quality === 'original') : offers
    const offerById = new Map(optOffers.map((o) => [o.offerId, o]))
    const planOffers = optOffers.map((o) => ({
      offerId: o.offerId,
      partId: o.partId,
      supplierId: o.supplierId,
      partType: o.quality,
      unitPrice: o.unitPrice,
      incoterm: o.incoterm,
    }))
    const { blockers, scenarios } = planPurchase({
      parts: planParts,
      offers: planOffers,
      suppliers: planSuppliers,
      mode,
      assumptions,
      params,
      fx,
    })
    const best =
      supplierMode === 'single'
        ? scenarios
            .filter((s) => s.kind === 'single')
            .reduce((acc, s) => (betterScenario(s, acc) ? s : acc), null)
        : scenarios.find((s) => s.kind === 'best')
    if (blockers.length > 0 || !best) {
      return { blockers, best: null, items: [] }
    }

    const items = best.cost.lines.map((l) => {
      const part = partById.get(l.partId)
      const offer = offerById.get(l.offerId)
      const unitCostClp = usdMicroToClp(l.unitLandedNet, fx).amount
      const baselineClp = part.baselinePrice?.amount ?? null
      const sale = salePrice({ costClp: unitCostClp, baselineClp, quality: offer.quality, pricing })
      return {
        partId: l.partId,
        name: part.nameEs,
        supplierId: l.supplierId,
        quality: QUALITY_ES[offer.quality],
        qty: l.qty,
        unitCostClp,
        sale,
        unitBaselineClp: baselineClp,
      }
    })
    const baselineClp = items.reduce((sum, i) => sum + (i.unitBaselineClp ?? 0) * i.qty, 0)
    const saleClp = items.reduce((sum, i) => sum + i.sale.priceClp * i.qty, 0)
    const costClp = usdMicroToClp(best.cost.totals.landedNet, fx).amount

    return {
      blockers: [],
      supplierIds: best.supplierIds,
      coveredCount: best.coveredPartIds.length,
      missingCount: best.missingPartIds.length,
      containers: best.cost.containers,
      units: items.reduce((sum, i) => sum + i.qty, 0),
      totals: {
        goodsClp: usdMicroToClp(best.cost.totals.goods, fx).amount,
        freightClp: usdMicroToClp(best.cost.totals.freight, fx).amount,
        insuranceClp: usdMicroToClp(best.cost.totals.insurance, fx).amount,
        cifClp: usdMicroToClp(best.cost.totals.cif, fx).amount,
        dutyClp: usdMicroToClp(best.cost.totals.duty, fx).amount,
        chileClp: usdMicroToClp(best.cost.totals.chile, fx).amount,
        costClp,
      },
      baselineClp,
      saleClp,
      profitClp: saleClp - costClp,
      savingClp: baselineClp - saleClp,
      items,
    }
  }

  const results = Object.fromEntries(SHIPMENT_OPTIONS.map((opt) => [opt, runOption(opt)]))

  // Sensibilidad: la cantidad ya es la real estimada (no tiene sentido "probar con menos"), así
  // que acá solo se mueve la tarifa de flete por contenedor — el supuesto más volátil de todos
  // (ver FCL_SOURCES en src/mocks/costParams.js) — sobre la opción "Más barato".
  const freightScenarios = FREIGHT_SENSITIVITY.map(({ key, labelEs, rateBp }) => {
    const scaledRates = {
      ...rates,
      fclContainers: {
        ...rates.fclContainers,
        [mode]: {
          ...rates.fclContainers[mode],
          freightCents: Math.round((rates.fclContainers[mode].freightCents * rateBp) / 10000),
        },
      },
    }
    const r = runOption('cheapest', scaledRates)
    return { key, labelEs, costClp: r.totals?.costClp ?? null, profitClp: r.profitClp ?? null }
  })

  return {
    partCount: usableParts.length,
    mode,
    suppliers: suppliers.map((s) => ({ id: s.id, name: nameOf.get(s.id), abbr: abbrOf.get(s.id) })),
    results,
    freightScenarios,
    anomalies,
    suspectOfferCount: suspect.size,
  }
}
