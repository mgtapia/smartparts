// Tabla de precios consolidada: para cada repuesto, el costo puesto en Chile en varios escenarios
// (mejor reparto combinado, mejor costo línea por línea, costo con el proveedor principal) y en
// los dos modos (aéreo y marítimo), al lado del PVP que ya calcula la fórmula actual. No decide
// nada: es un reporte para revisar a mano y decidir un precio fijo que no dependa de qué
// proveedor tengamos hoy. No escribe nada en Firestore.
//
// Reusa el motor de Carga completa (`buildFullShipment`, ya sirve para modo 'air' sin cambios —
// `costShipment` del motor de costos ya soporta aéreo) y el de Catálogo/ficha del repuesto
// (`buildPartCosts`, costo mínimo línea por línea sin gastos de embarque compartidos). No se
// reescriben: se llaman.
import { buildFullShipment } from '@features/costing/fullShipmentModel'
import { buildPartCosts, bestOf } from '@features/costing/partCostsModel'
import { usdMicroToClp } from '@libs/fx'

/** Si el PVP es más de esto veces el costo, probablemente el precio REF está mal o no es la misma pieza. */
export const PRICE_GAP_FACTOR = 5

/**
 * @param {Object} input
 * @param {any[]} input.parts            Repuestos del vehículo en sourcing, con `quotes`, `quantityEstimated`.
 * @param {any[]} input.suppliers        Proveedores.
 * @param {string} input.probableSupplierId  Proveedor "más probable" (hoy Henan Ronglai).
 * @param {(supplierId: string) => any} input.settingsForAir
 * @param {(supplierId: string) => any} input.settingsForSea
 * @param {any} input.rates
 * @param {any} input.params
 * @param {any} input.fx
 * @param {{ minMarginBp: number, maxSavingOemBp: number, maxSavingAltBp: number, minSavingBp: number }} input.pricingAir
 * @param {{ minMarginBp: number, maxSavingOemBp: number, maxSavingAltBp: number, minSavingBp: number }} input.pricingSea
 * @param {'sea_fcl_20'|'sea_fcl_40hq'} input.seaMode
 * @param {'original'|'cheapest'} input.option
 */
export function buildPriceReview({
  parts,
  suppliers,
  probableSupplierId,
  settingsForAir,
  settingsForSea,
  rates,
  params,
  fx,
  pricingAir,
  pricingSea,
  seaMode,
  option,
}) {
  const probableSupplier = suppliers.find((s) => s.id === probableSupplierId)
  const probableOnly = probableSupplier ? [probableSupplier] : []

  // 1) Mejor combinado: el reparto óptimo entre todos los proveedores a la vez (como Carga
  //    completa con "Varios proveedores") — comparte gastos de embarque entre líneas.
  const combinedAir = buildFullShipment({
    parts,
    suppliers,
    settingsFor: settingsForAir,
    rates,
    params,
    fx,
    pricing: pricingAir,
    mode: 'air',
    supplierMode: 'multiple',
  }).results[option]
  const combinedSea = buildFullShipment({
    parts,
    suppliers,
    settingsFor: settingsForSea,
    rates,
    params,
    fx,
    pricing: pricingSea,
    mode: seaMode,
    supplierMode: 'multiple',
  }).results[option]

  // 2) Más probable: todo comprado al proveedor principal, con sus propios gastos de embarque
  //    compartidos entre sus líneas (no las del resto).
  const probableAir = probableOnly.length
    ? buildFullShipment({
        parts,
        suppliers: probableOnly,
        settingsFor: settingsForAir,
        rates,
        params,
        fx,
        pricing: pricingAir,
        mode: 'air',
        supplierMode: 'multiple',
      }).results[option]
    : null
  const probableSea = probableOnly.length
    ? buildFullShipment({
        parts,
        suppliers: probableOnly,
        settingsFor: settingsForSea,
        rates,
        params,
        fx,
        pricing: pricingSea,
        mode: seaMode,
        supplierMode: 'multiple',
      }).results[option]
    : null

  // 3) Mejor por línea: el proveedor más barato de cada repuesto por separado, sin compartir
  //    gastos de embarque entre líneas (lo mismo que ya muestran Catálogo y la ficha del repuesto).
  const lineCostsAir = buildPartCosts({
    parts,
    suppliers,
    settingsFor: settingsForAir,
    rates,
    params,
    fx,
    mode: 'air',
  })
  const lineCostsSea = buildPartCosts({
    parts,
    suppliers,
    settingsFor: settingsForSea,
    rates,
    params,
    fx,
    mode: seaMode,
  })

  const itemsByPartId = (result) => new Map((result?.items ?? []).map((i) => [i.partId, i]))
  const combinedAirByPart = itemsByPartId(combinedAir)
  const combinedSeaByPart = itemsByPartId(combinedSea)
  const probableAirByPart = itemsByPartId(probableAir)
  const probableSeaByPart = itemsByPartId(probableSea)

  const lineClp = (costs, partId) => {
    const best = bestOf(costs, partId, option)
    return best ? usdMicroToClp(best.usdMicro, fx).amount : null
  }

  const allPartIds = new Set([
    ...combinedAirByPart.keys(),
    ...combinedSeaByPart.keys(),
    ...probableAirByPart.keys(),
    ...probableSeaByPart.keys(),
  ])

  const rows = []
  for (const partId of allPartIds) {
    const part = parts.find((p) => p.id === partId)
    if (!part) continue
    const cAir = combinedAirByPart.get(partId)
    const cSea = combinedSeaByPart.get(partId)
    const pAir = probableAirByPart.get(partId)
    const pSea = probableSeaByPart.get(partId)

    const costCombinedAirClp = cAir?.unitCostClp ?? null
    const costCombinedSeaClp = cSea?.unitCostClp ?? null
    const costLineAirClp = lineClp(lineCostsAir, partId)
    const costLineSeaClp = lineClp(lineCostsSea, partId)
    // El PVP de hoy se calcula sobre el costo "más probable": es el que de verdad pagaríamos.
    const costProbableAirClp = pAir?.unitCostClp ?? null
    const costProbableSeaClp = pSea?.unitCostClp ?? null
    const pvpAirClp = pAir?.sale.priceClp ?? null
    const pvpSeaClp = pSea?.sale.priceClp ?? null
    const refClp = part.baselinePrice?.amount ?? null

    const marginPct = (pvp, cost) => (pvp && cost ? (pvp - cost) / pvp : null)
    const diffPct = (sea, air) => (sea != null && air ? (air - sea) / air : null)

    rows.push({
      partId,
      name: part.nameEs,
      code: part.code,
      quality: (pAir ?? cAir ?? pSea ?? cSea)?.quality ?? null,
      costCombinedAirClp,
      costLineAirClp,
      costProbableAirClp,
      costCombinedSeaClp,
      costLineSeaClp,
      costProbableSeaClp,
      pvpAirClp,
      pvpSeaClp,
      refClp,
      marginAirPct: marginPct(pvpAirClp, costProbableAirClp),
      marginSeaPct: marginPct(pvpSeaClp, costProbableSeaClp),
      seaVsAirCostPct: diffPct(costProbableSeaClp, costProbableAirClp),
      seaVsAirPvpPct: diffPct(pvpSeaClp, pvpAirClp),
      priceGap:
        (pvpAirClp && costProbableAirClp && pvpAirClp / costProbableAirClp >= PRICE_GAP_FACTOR) ||
        (pvpSeaClp && costProbableSeaClp && pvpSeaClp / costProbableSeaClp >= PRICE_GAP_FACTOR),
    })
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, 'es'))

  return { rows, probableSupplierId, seaMode, option }
}
