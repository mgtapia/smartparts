// Motor de costos — punto de entrada único. Función pura: sin React, sin
// Firebase, sin red. Entra un CostingInput, sale un CostingResult.
// Cadena: FOB → + flete → + seguro → CIF → + arancel → base IVA → + IVA
//         → + gastos locales → landed cost.
// Ver docs/MOTOR-DE-COSTOS.md para la explicación completa de cada paso.
import { money, allocateByWeights } from '../../libs/money'
import { toUsdMicro } from '../../libs/fx'
import { airChargeableWeight, seaLclChargeableRt } from './weights'
import { allocate } from './allocation'
import { evaluateAllLocalCosts } from './localCosts'
import { computeDuty } from './duties'
import { computeVat } from './vat'
import { checkDgBlockers } from './dgBlocker'

export const ENGINE_VERSION = '1.0.0'

/**
 * @param {number} grossWeightG
 * @param {number} volumeCm3
 * @param {import('./types').ShippingMode} mode
 * @param {import('./types').CostParamSet['freightDefaults']} freightDefaults
 * @returns {{ chargeableUnitsMicro: number, chargeableBasis: 'real'|'volumetric' }}
 */
function chargeableUnitsForLine(grossWeightG, volumeCm3, mode, freightDefaults) {
  if (mode === 'air' || mode === 'courier') {
    const { chargeableKg, basis } = airChargeableWeight(
      grossWeightG,
      volumeCm3,
      freightDefaults.airVolumetricDivisor,
    )
    return { chargeableUnitsMicro: Math.round(chargeableKg * 1e6), chargeableBasis: basis }
  }
  // sea_lcl, sea_fcl_20, sea_fcl_40hq: W/M — el mayor entre peso real y CBM.
  const { chargeableRt, basis } = seaLclChargeableRt(
    grossWeightG,
    volumeCm3,
    freightDefaults.seaLclWmKgPerCbm,
  )
  return { chargeableUnitsMicro: Math.round(chargeableRt * 1e6), chargeableBasis: basis }
}

/**
 * @param {import('./types').CostingInput} input
 * @returns {import('./types').CostingResult}
 */
export function computeCosting(input) {
  const { mode, lines, freightQuote, params, fx, options = {} } = input
  const insured = options.insured ?? true
  const warehousingDays = options.warehousingDays ?? 0

  const blockers = []
  const warnings = []

  // 1) Por línea: DG, FOB, unidades facturables.
  const prepared = lines.map((line) => {
    const dg = checkDgBlockers(mode, line.dgProfile)
    dg.blockers.forEach((b) => blockers.push(`${line.lineId}: ${b}`))
    dg.warnings.forEach((w) => warnings.push(`${line.lineId}: ${w}`))

    const fobUnitMicro = toUsdMicro(line.unitFob, fx)
    const fobMicro = fobUnitMicro * line.qty
    const { chargeableUnitsMicro, chargeableBasis } = chargeableUnitsForLine(
      line.grossWeightG,
      line.volumeCm3,
      mode,
      params.freightDefaults,
    )

    return {
      line,
      blocked: dg.blockers.length > 0,
      blockReasons: dg.blockers,
      fobMicro,
      chargeableUnitsMicro,
      chargeableBasis,
    }
  })

  const active = prepared.filter((p) => !p.blocked)
  const fobPerLine = active.map((p) => p.fobMicro)
  const chargeableUnitsPerLine = active.map((p) => p.chargeableUnitsMicro)
  const volumePerLine = active.map((p) => p.line.volumeCm3)

  // 2) Flete: prorrateo del total cotizado por unidades facturables — nunca
  //    una tarifa inventada, siempre la cotización real del forwarder.
  const freightTotalMicro = toUsdMicro(freightQuote, fx)
  const freightPerLine = allocate(freightTotalMicro, 'by_chargeable_units', {
    fobPerLine,
    cifPerLine: [],
    chargeableUnitsPerLine,
    volumePerLine,
  })

  // 3) Seguro: valor asegurado = (FOB + flete) × (1 + markup); prima = valor × tasa,
  //    con piso de prima por embarque repartido proporcionalmente si no se alcanza.
  const insurancePerLine = active.map((p, i) => {
    if (!insured) return 0
    const insuredValueMicro = Math.round(
      (p.fobMicro + freightPerLine[i]) * (1 + params.insurance.markupBp / 10000),
    )
    return Math.round((insuredValueMicro * params.insurance.rateBp) / 10000)
  })
  const insuranceSumMicro = insurancePerLine.reduce((a, b) => a + b, 0)
  const minPremiumMicro = insured ? toUsdMicro(params.insurance.minPremium, fx) : 0
  const insuranceShortfall = Math.max(0, minPremiumMicro - insuranceSumMicro)
  const insuranceTopUp =
    insuranceShortfall > 0 ? allocateByWeights(insuranceShortfall, fobPerLine) : active.map(() => 0)
  const finalInsurancePerLine = insurancePerLine.map((v, i) => v + insuranceTopUp[i])

  // 4) CIF por línea.
  const cifPerLine = active.map((p, i) => p.fobMicro + freightPerLine[i] + finalInsurancePerLine[i])

  // 5) Arancel + IVA por línea.
  const dutyPerLine = []
  const vatPerLine = []
  active.forEach((p, i) => {
    const { dutyMicro, warning } = computeDuty(
      cifPerLine[i],
      p.line.hsCode,
      p.line.originCert,
      params.duty,
    )
    if (warning) warnings.push(`${p.line.lineId}: ${warning}`)
    dutyPerLine.push(dutyMicro)
    vatPerLine.push(computeVat(cifPerLine[i], dutyMicro, params.vat.rateBp))
  })

  // 6) Gastos locales: catálogo evaluado sobre los totales del embarque activo,
  //    cada concepto prorrateado según su propia base.
  const cifTotalMicro = cifPerLine.reduce((a, b) => a + b, 0)
  const chargeableUnitsTotalMicro = chargeableUnitsPerLine.reduce((a, b) => a + b, 0)
  const evaluatedConcepts = evaluateAllLocalCosts(params.localCosts, mode, {
    cifTotalMicro,
    chargeableUnitsTotalMicro,
    warehousingDays,
  })
  const localCostsPerLine = active.map(() => 0)
  evaluatedConcepts.forEach((concept) => {
    const perLine = allocate(concept.amountMicro, concept.allocation, {
      fobPerLine,
      cifPerLine,
      chargeableUnitsPerLine,
      volumePerLine,
    })
    perLine.forEach((v, i) => (localCostsPerLine[i] += v))
  })

  // 7) DG surcharges: directos a las líneas que los causan.
  const isDgTarget = active.map((p) => Boolean(p.line.dgProfile))
  ;(params.dgSurcharges || [])
    .filter((s) => s.appliesToModes.includes(mode))
    .forEach((s) => {
      let amountMicro = 0
      if (s.type === 'fixed') amountMicro = s.fixed ? toUsdMicro(s.fixed, fx) : 0
      if (s.type === 'fixed_plus_per_kg') {
        const kgTotal = active.reduce((sum, p) => sum + p.line.grossWeightG / 1000, 0)
        amountMicro =
          (s.fixed ? toUsdMicro(s.fixed, fx) : 0) +
          Math.round((s.perKg ? toUsdMicro(s.perKg, fx) : 0) * kgTotal)
      }
      if (s.type === 'percent_uplift_on_insurance') {
        amountMicro = Math.round((insuranceSumMicro * (s.rateBp || 0)) / 10000)
      }
      if (amountMicro === 0 || !isDgTarget.some(Boolean)) return
      const perLine = allocate(amountMicro, 'direct', {
        fobPerLine,
        cifPerLine,
        chargeableUnitsPerLine,
        volumePerLine,
        isTarget: isDgTarget,
      })
      perLine.forEach((v, i) => (localCostsPerLine[i] += v))
    })

  // 8) landedNet (sin IVA — recuperable) y cashOutlay (con IVA — plata que sale hoy).
  const landedNetPerLine = active.map(
    (p, i) => cifPerLine[i] + dutyPerLine[i] + localCostsPerLine[i],
  )
  const cashOutlayPerLine = active.map((p, i) => landedNetPerLine[i] + vatPerLine[i])

  const activeLines = active.map((p, i) => ({
    lineId: p.line.lineId,
    blocked: false,
    blockReasons: [],
    chargeableBasis: p.chargeableBasis,
    chargeableUnitsMicro: p.chargeableUnitsMicro,
    fob: money(p.fobMicro, 'USD'),
    freight: money(freightPerLine[i], 'USD'),
    insurance: money(finalInsurancePerLine[i], 'USD'),
    cif: money(cifPerLine[i], 'USD'),
    duty: money(dutyPerLine[i], 'USD'),
    vat: money(vatPerLine[i], 'USD'),
    localCosts: money(localCostsPerLine[i], 'USD'),
    landedNet: money(landedNetPerLine[i], 'USD'),
    cashOutlay: money(cashOutlayPerLine[i], 'USD'),
    unitLandedNetMicro: Math.round(landedNetPerLine[i] / p.line.qty / 100) * 100,
  }))

  const blockedLines = prepared
    .filter((p) => p.blocked)
    .map((p) => ({
      lineId: p.line.lineId,
      blocked: true,
      blockReasons: p.blockReasons,
      chargeableBasis: p.chargeableBasis,
      chargeableUnitsMicro: p.chargeableUnitsMicro,
      fob: money(p.fobMicro, 'USD'),
      freight: money(0, 'USD'),
      insurance: money(0, 'USD'),
      cif: money(0, 'USD'),
      duty: money(0, 'USD'),
      vat: money(0, 'USD'),
      localCosts: money(0, 'USD'),
      landedNet: money(0, 'USD'),
      cashOutlay: money(0, 'USD'),
      unitLandedNetMicro: 0,
    }))

  // Totales: SIEMPRE suma de las líneas activas (nunca una fórmula aparte),
  // así "Σ líneas === total" es una propiedad estructural, no una coincidencia.
  const sumField = (arr) => arr.reduce((a, b) => a + b, 0)
  const totals = {
    fob: money(sumField(fobPerLine), 'USD'),
    freight: money(sumField(freightPerLine), 'USD'),
    insurance: money(sumField(finalInsurancePerLine), 'USD'),
    cif: money(cifTotalMicro, 'USD'),
    duty: money(sumField(dutyPerLine), 'USD'),
    vat: money(sumField(vatPerLine), 'USD'),
    localCosts: money(sumField(localCostsPerLine), 'USD'),
    landedNet: money(sumField(landedNetPerLine), 'USD'),
    cashOutlay: money(sumField(cashOutlayPerLine), 'USD'),
    upliftBp:
      sumField(fobPerLine) > 0
        ? Math.round(
            ((sumField(landedNetPerLine) - sumField(fobPerLine)) / sumField(fobPerLine)) * 10000,
          )
        : 0,
  }

  return {
    lines: [...activeLines, ...blockedLines],
    totals,
    warnings,
    blockers,
    logistics: {
      // Placeholder hasta el modelo de lead time de Fase 2 (docs/MOTOR-DE-COSTOS.md).
      leadTimeTotalDays: warehousingDays,
    },
    engineVersion: ENGINE_VERSION,
    paramSetId: params.id,
    computedAt: new Date().toISOString(),
  }
}
