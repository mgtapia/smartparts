// Plan de compra de un pedido completo (canasta de repuestos con cantidades) entre varios
// proveedores. Función pura, dos piezas:
//
// 1. `costShipment`: costo real, puesto en Chile, de un reparto dado (qué repuesto se le
//    compra a qué proveedor). Los gastos se cobran donde corresponden, sin prorrateo:
//      - por proveedor: transporte en China (su distancia y sus toneladas), gastos de
//        exportación y transferencia bancaria. Cada proveedor extra los suma de nuevo;
//      - por embarque consolidado: flete, seguro, gastos en Chile y agente de aduanas, una vez.
//    En contenedor completo (FCL) el embarque consolidado son N contenedores, los que alcanzan
//    para el volumen y el peso de todo el pedido: flete y gastos por contenedor van × N.
// 2. `planPurchase`: prueba todas las combinaciones de proveedores y, en cada una, le asigna
//    cada repuesto al proveedor con menor costo unitario final; después costea el reparto
//    completo. Así se ve el costo de comprarle todo a cada uno y la mejor combinación, con los
//    gastos fijos de sumar proveedores incluidos.
//
// Montos en micros de USD. Ningún float de dinero: los repartos usan allocateByWeights.
import { allocateByWeights, fromMicros, roundHalfUp } from '../../libs/money'
import { toUsdMicro } from '../../libs/fx'
import { computeCosting } from './engine'
import { airChargeableWeight, seaLclChargeableRt } from './weights'
import { chargeModeKey, unitShipmentCharges } from './shipmentCharges'
import { containerShare, containersNeeded, isFclMode } from './containers'
import { computeUnitCost } from './unitCost'

const EXW = 'EXW'
const COSTABLE_INCOTERMS = ['EXW', 'FOB', 'FCA']
const ASSUMED_HS = 'SUPUESTA-TLC'
const MAX_SUPPLIERS_TO_COMBINE = 12

/**
 * @typedef {Object} PlanPart
 * @property {string} partId
 * @property {number} qty
 * @property {number} weightG      Peso bruto por unidad.
 * @property {number} volumeCm3    Volumen por unidad.
 * @property {import('./types').DgProfile} [dgProfile]  Mercancía peligrosa: sin oferta en el modo donde no puede ir.
 * @property {number|null} [baselineUsdMicro]  Precio unitario que paga hoy el cliente, en USD.
 */

/**
 * @typedef {Object} PlanOffer
 * @property {string} offerId
 * @property {string} partId
 * @property {string} supplierId
 * @property {'original'|'alternative'} partType
 * @property {import('../../libs/money').Money} unitPrice  Precio del tramo que corresponde a la cantidad.
 * @property {string|null} incoterm
 */

/**
 * @typedef {Object} PlanSupplier
 * @property {string} id
 * @property {number|null} originDistanceKm
 * @property {{ bp: number, averageKm: number|null }} [originFallback]
 * @property {'yes'|'no'|'unknown'} formF
 */

/**
 * @typedef {Object} ShipmentCost
 * @property {string[]} blockers
 * @property {Record<string, number>} totals   Micros de USD: goods, inland, export, freight,
 *   insurance, cif, duty, chile, bank, landedNet, vat.
 * @property {Array<{ supplierId: string, goods: number, inland: number, export: number, bank: number, parts: number, units: number }>} bySupplier
 * @property {Array<{ partId: string, supplierId: string, offerId: string, qty: number, goods: number, landedNet: number, unitLandedNet: number }>} lines
 * @property {number|null} [containers]  Contenedores del embarque (solo en contenedor completo).
 */

const sum = (list, key) => list.reduce((acc, x) => acc + (key ? x[key] : x), 0)
const toCents = (micro) => roundHalfUp(micro / 10_000) * 10_000

/** Transporte en China de un proveedor por todo lo que despacha. */
function inlandFor({ supplier, tons, goodsMicro, modeKey, chargeable, charges }) {
  const at = (km) =>
    sum(
      unitShipmentCharges({
        charges,
        modeKey,
        unitChargeable: chargeable,
        shipmentChargeable: chargeable,
        unitTons: tons,
        distanceKm: km,
      }),
      'usdMicro',
    )
  if (supplier.originDistanceKm != null) return at(supplier.originDistanceKm)
  // Sin distancia: el mayor entre un % de la mercadería y el transporte con la distancia
  // promedio (supuesto conservador; con cero saldría más barato que los que tienen dato).
  const fallback = supplier.originFallback ?? { bp: 0, averageKm: null }
  const byPrice = roundHalfUp((goodsMicro * fallback.bp) / 10000)
  return Math.max(byPrice, fallback.averageKm != null ? at(fallback.averageKm) : 0)
}

/**
 * Costo puesto en Chile de un reparto. `assignments`: una oferta elegida por repuesto.
 * @param {Object} input
 * @param {Array<{ part: PlanPart, offer: PlanOffer }>} input.assignments
 * @param {Map<string, PlanSupplier>} input.suppliers
 * @param {import('./types').ShippingMode} input.mode
 * @param {import('./unitCost').UnitCostAssumptions} input.assumptions
 * @param {import('./types').CostParamSet} input.params
 * @param {import('./types').FxSnapshot} input.fx
 * @returns {ShipmentCost}
 */
export function costShipment({ assignments, suppliers, mode, assumptions, params, fx }) {
  const isAir = mode === 'air' || mode === 'courier'
  const isFcl = isFclMode(mode)
  const modeKey = chargeModeKey(mode)
  const container = isFcl ? assumptions.fclContainers?.[mode] : null
  const rateCents = isFcl
    ? container?.freightCents
    : isAir
      ? assumptions.airUsdPerKgCents
      : assumptions.seaUsdPerRtCents
  const containerReady = !isFcl || (container?.capacityM3 > 0 && container?.capacityKg > 0)
  if (rateCents == null || !containerReady) {
    return {
      blockers: [
        isFcl
          ? 'Falta el flete o la capacidad del contenedor'
          : `Falta la tarifa de flete ${isAir ? 'aéreo' : 'marítimo'}`,
      ],
      totals: {},
      bySupplier: [],
      lines: [],
      containers: null,
    }
  }
  const empty = { blockers: [], totals: {}, bySupplier: [], lines: [], containers: null }
  if (assignments.length === 0) return empty

  const airDivisor = assumptions.airVolumetricDivisor ?? params.freightDefaults.airVolumetricDivisor
  const wm = params.freightDefaults.seaLclWmKgPerCbm
  const charges = assumptions.shipmentCharges ?? []
  const stage = (s) => charges.filter((c) => c.stage === s)
  // Unidad cobrable: kg (aéreo), R/T (LCL) o parte de un contenedor (FCL).
  const chargeableOf = (weightG, volumeCm3) => {
    if (isFcl) return containerShare(weightG, volumeCm3, container).share
    return isAir
      ? airChargeableWeight(weightG, volumeCm3, airDivisor).chargeableKg
      : seaLclChargeableRt(weightG, volumeCm3, wm).chargeableRt
  }
  // En FCL los gastos de origen por contenedor (THC, VGM, sello) se cobran por contenedor
  // físico del embarque, no por proveedor: van aparte, sobre los N contenedores.
  const perContainer = (c) => isFcl && c.basis === 'per_unit'

  const lines = assignments.map(({ part, offer }) => {
    const weightG = part.weightG * part.qty
    const volumeCm3 = part.volumeCm3 * part.qty
    return {
      part,
      offer,
      weightG,
      volumeCm3,
      tons: seaLclChargeableRt(weightG, volumeCm3, wm).chargeableRt,
      goods: toCents(toUsdMicro(offer.unitPrice, fx) * part.qty),
    }
  })

  // Contenedores del pedido consolidado (solo FCL): los que alcanzan para el volumen y el peso.
  const totalWeight = sum(lines, 'weightG')
  const totalVolume = sum(lines, 'volumeCm3')
  const containers = isFcl ? containersNeeded(totalWeight, totalVolume, container) : null
  const totalChargeable = chargeableOf(totalWeight, totalVolume)

  // Gastos de origen por contenedor (FCL): × N contenedores, solo por la parte EXW del pedido
  // (en FOB/FCA el proveedor ya los incluye en su precio). Se reparten entre los proveedores
  // EXW según la parte de contenedor que ocupa cada uno.
  const exwLines = lines.filter((l) => l.offer.incoterm === EXW)
  let containerOriginCents = 0
  if (isFcl && exwLines.length > 0) {
    const perContainers = sum(
      unitShipmentCharges({
        charges: stage('origin').filter(perContainer),
        modeKey,
        unitChargeable: containers,
        shipmentChargeable: containers,
      }),
      'usdMicro',
    )
    const exwShare = Math.min(
      1,
      chargeableOf(sum(exwLines, 'weightG'), sum(exwLines, 'volumeCm3')) / totalChargeable,
    )
    containerOriginCents = roundHalfUp((perContainers * exwShare) / 10_000)
  }

  // 1) Por proveedor: transporte en China, exportación (solo EXW) y banco.
  const groups = new Map()
  for (const l of lines) {
    if (!groups.has(l.offer.supplierId)) groups.set(l.offer.supplierId, [])
    groups.get(l.offer.supplierId).push(l)
  }
  const groupList = [...groups]
  const exwChargeableOf = (group) => {
    const exw = group.filter((l) => l.offer.incoterm === EXW)
    return exw.length ? chargeableOf(sum(exw, 'weightG'), sum(exw, 'volumeCm3')) : 0
  }
  const containerOriginShare = allocateByWeights(
    containerOriginCents,
    groupList.map(([, group]) => Math.round(exwChargeableOf(group) * 1e9)),
  )
  const bySupplier = []
  for (const [index, [supplierId, group]] of groupList.entries()) {
    const supplier = suppliers.get(supplierId)
    const goods = sum(group, 'goods')
    const exw = group.filter((l) => l.offer.incoterm === EXW)
    const exwGoods = sum(exw, 'goods')
    const chargeable = exwChargeableOf(group)
    // En FCL el camión en China se cobra por contenedor × km según la parte de contenedor que
    // ocupa lo que despacha el proveedor: contenedores completos más la fracción del último. La
    // fracción no paga un camión entero porque en un pedido consolidado ese saldo viaja junto
    // con el de otros proveedores (el forwarder lo junta en su ruta o en su bodega); cobrarle un
    // contenedor entero a cada saldo castigaría dos veces combinar proveedores, ya que los
    // contenedores del embarque se redondean hacia arriba sobre el pedido completo.
    const inland = exw.length
      ? toCents(
          inlandFor({
            supplier,
            tons: sum(exw, 'tons'),
            goodsMicro: exwGoods,
            modeKey,
            chargeable,
            charges: stage('inland'),
          }),
        )
      : 0
    const exportCost = exw.length
      ? toCents(
          sum(
            unitShipmentCharges({
              charges: stage('origin').filter((c) => !perContainer(c)),
              modeKey,
              unitChargeable: chargeable,
              shipmentChargeable: chargeable,
              baseMicro: { price: exwGoods },
            }),
            'usdMicro',
          ),
        ) +
        containerOriginShare[index] * 10_000
      : 0
    const bank = sum(
      unitShipmentCharges({
        charges: stage('payment'),
        modeKey,
        unitChargeable: 1,
        shipmentChargeable: 1,
        baseMicro: { price: goods },
      }),
      'usdMicro',
    )
    // Transporte y exportación se suman al FOB de las líneas EXW, según sus toneladas.
    const originShare = allocateByWeights(
      (inland + exportCost) / 10_000,
      exw.map((l) => Math.round(l.tons * 1e6)),
    )
    exw.forEach((l, i) => (l.origin = originShare[i] * 10_000))
    group.forEach((l) => {
      l.origin ??= 0
      l.formF = supplier?.formF ?? 'unknown'
    })
    const bankShare = allocateByWeights(
      bank,
      group.map((l) => l.goods),
    )
    group.forEach((l, i) => (l.bank = bankShare[i]))
    bySupplier.push({
      supplierId,
      goods,
      inland,
      export: exportCost,
      bank,
      parts: group.length,
      units: sum(group.map((l) => l.part.qty)),
    })
  }

  // 2) Embarque consolidado: flete sobre el total cobrable (FCL: N contenedores), seguro, CIF y
  //    arancel por línea.
  const freight = isFcl
    ? containers * rateCents * 10_000
    : roundHalfUp((totalChargeable * 1e6 * rateCents) / 100)
  const generalBp = assumptions.generalDutyBp ?? params.duty.generalAdValoremBp
  const result = computeCosting({
    mode,
    lines: lines.map((l, i) => ({
      lineId: String(i),
      qty: 1,
      unitFob: fromMicros(l.goods + l.origin, 'USD'),
      grossWeightG: l.weightG,
      volumeCm3: l.volumeCm3,
      originCert: l.formF === 'yes' ? 'form_f' : 'none',
      hsCode: l.formF === 'yes' ? ASSUMED_HS : undefined,
    })),
    freightQuote: fromMicros(freight, 'USD'),
    params: {
      ...params,
      localCosts: [],
      duty: {
        ...params.duty,
        generalAdValoremBp: generalBp,
        rateOverridesByHs: {
          ...params.duty.rateOverridesByHs,
          [ASSUMED_HS]: { generalBp, ftaBp: assumptions.ftaDutyBp },
        },
      },
    },
    fx,
    options: { insured: true },
  })
  if (result.blockers.length > 0) return { ...empty, blockers: result.blockers }

  // 3) Gastos en Chile y agente de aduanas, una vez por embarque, repartidos por línea. En FCL
  //    los gastos por contenedor (THC, retiro, reparto) van × N contenedores.
  const cifTotal = result.totals.cif.amount
  const shipmentUnits = isFcl ? containers : totalChargeable
  const chile = sum(
    unitShipmentCharges({
      charges: [...stage('destination'), ...stage('customs')],
      modeKey,
      unitChargeable: shipmentUnits,
      shipmentChargeable: shipmentUnits,
      baseMicro: { cif: cifTotal },
    }),
    'usdMicro',
  )
  const engineLines = result.lines
  const chileShare = allocateByWeights(
    chile,
    engineLines.map((x) => x.cif.amount),
  )

  const outLines = lines.map((l, i) => {
    const landedNet = engineLines[i].landedNet.amount + chileShare[i] + l.bank
    return {
      partId: l.part.partId,
      supplierId: l.offer.supplierId,
      offerId: l.offer.offerId,
      qty: l.part.qty,
      goods: l.goods,
      landedNet,
      unitLandedNet: roundHalfUp(landedNet / l.part.qty),
    }
  })

  const totals = {
    goods: sum(lines, 'goods'),
    inland: sum(bySupplier, 'inland'),
    export: sum(bySupplier, 'export'),
    freight: result.totals.freight.amount,
    insurance: result.totals.insurance.amount,
    cif: cifTotal,
    duty: result.totals.duty.amount,
    chile,
    bank: sum(bySupplier, 'bank'),
    landedNet: sum(outLines, 'landedNet'),
    vat: result.totals.vat.amount,
  }
  return { blockers: [], totals, bySupplier, lines: outLines, containers }
}

/**
 * @typedef {Object} PlanScenario
 * @property {string} id
 * @property {'best'|'bestOfSize'|'single'} kind
 * @property {string[]} supplierIds
 * @property {string[]} coveredPartIds
 * @property {string[]} missingPartIds
 * @property {ShipmentCost} cost
 * @property {number} baselineMicro   Lo que paga hoy el cliente por los repuestos cubiertos.
 */

/**
 * Prueba todas las combinaciones de proveedores. En cada una, cada repuesto va al proveedor
 * con menor costo unitario final (`computeUnitCost`, con los gastos por embarque
 * prorrateados); después se costea el reparto completo con `costShipment`. Entre dos
 * combinaciones gana la que cubre más repuestos y, a igual cobertura, la más barata.
 * @param {Object} input
 * @param {PlanPart[]} input.parts
 * @param {PlanOffer[]} input.offers
 * @param {PlanSupplier[]} input.suppliers
 * @param {import('./types').ShippingMode} input.mode
 * @param {import('./unitCost').UnitCostAssumptions} input.assumptions
 * @param {import('./types').CostParamSet} input.params
 * @param {import('./types').FxSnapshot} input.fx
 * @returns {{ blockers: string[], scenarios: PlanScenario[] }}
 */
export function planPurchase({ parts, offers, suppliers, mode, assumptions, params, fx }) {
  const supplierById = new Map(suppliers.map((s) => [s.id, s]))
  const partById = new Map(parts.map((p) => [p.partId, p]))

  // Costo unitario final de cada oferta: decide a quién se le asigna cada repuesto.
  const ranked = new Map() // partId → [{ offer, unitMicro }] ordenado de menor a mayor
  for (const offer of offers) {
    const part = partById.get(offer.partId)
    const supplier = supplierById.get(offer.supplierId)
    if (!part || !supplier || !COSTABLE_INCOTERMS.includes(offer.incoterm)) continue
    const unit = computeUnitCost({
      unitPrice: offer.unitPrice,
      incoterm: offer.incoterm,
      originDistanceKm: supplier.originDistanceKm,
      originFallback: supplier.originFallback,
      formF: supplier.formF,
      weightG: part.weightG,
      dgProfile: part.dgProfile,
      volumeCm3: part.volumeCm3,
      logisticsConfirmed: false,
      mode,
      assumptions,
      params,
      fx,
    })
    if (unit.landedNetUsdMicro == null) continue
    if (!ranked.has(offer.partId)) ranked.set(offer.partId, [])
    ranked.get(offer.partId).push({ offer, unitMicro: unit.landedNetUsdMicro })
  }
  for (const list of ranked.values()) list.sort((a, b) => a.unitMicro - b.unitMicro)

  const withOffers = [...new Set([...ranked.values()].flat().map((r) => r.offer.supplierId))]
  if (withOffers.length > MAX_SUPPLIERS_TO_COMBINE) {
    return {
      blockers: [`Más de ${MAX_SUPPLIERS_TO_COMBINE} proveedores: acotar la búsqueda`],
      scenarios: [],
    }
  }

  const evaluate = (supplierIds) => {
    const allowed = new Set(supplierIds)
    const assignments = []
    const missingPartIds = []
    for (const part of parts) {
      const pick = ranked.get(part.partId)?.find((r) => allowed.has(r.offer.supplierId))
      if (pick) assignments.push({ part, offer: pick.offer })
      else missingPartIds.push(part.partId)
    }
    const cost = costShipment({
      assignments,
      suppliers: supplierById,
      mode,
      assumptions,
      params,
      fx,
    })
    const coveredPartIds = assignments.map((a) => a.part.partId)
    const baselineMicro = assignments.reduce(
      (acc, a) => acc + (a.part.baselineUsdMicro ?? 0) * a.part.qty,
      0,
    )
    // Proveedores que de verdad reciben algo (una combinación puede incluir uno que no gana nada).
    const used = [...new Set(assignments.map((a) => a.offer.supplierId))].sort()
    return { supplierIds: used, coveredPartIds, missingPartIds, cost, baselineMicro }
  }

  const better = (a, b) => {
    if (!b) return true
    if (a.coveredPartIds.length !== b.coveredPartIds.length) {
      return a.coveredPartIds.length > b.coveredPartIds.length
    }
    return (a.cost.totals.landedNet ?? Infinity) < (b.cost.totals.landedNet ?? Infinity)
  }

  const bestBySize = new Map()
  let best = null
  const seen = new Set()
  const n = withOffers.length
  for (let mask = 1; mask < 1 << n; mask++) {
    const ids = withOffers.filter((_, i) => mask & (1 << i))
    const result = evaluate(ids)
    if (result.cost.blockers.length > 0) {
      return { blockers: result.cost.blockers, scenarios: [] }
    }
    const key = result.supplierIds.join('|')
    if (seen.has(key) || result.supplierIds.length === 0) continue
    seen.add(key)
    const size = result.supplierIds.length
    if (better(result, bestBySize.get(size))) bestBySize.set(size, result)
    if (better(result, best)) best = result
  }

  const scenarios = []
  if (best) scenarios.push({ id: 'best', kind: 'best', ...best })
  for (const [size, result] of [...bestBySize.entries()].sort((a, b) => a[0] - b[0])) {
    if (size === 1 || result === best) continue
    scenarios.push({ id: `best-${size}`, kind: 'bestOfSize', ...result })
  }
  for (const supplierId of withOffers) {
    scenarios.push({ id: `single-${supplierId}`, kind: 'single', ...evaluate([supplierId]) })
  }
  return { blockers: [], scenarios }
}
