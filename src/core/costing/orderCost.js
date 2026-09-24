// Costo de una orden de compra (OC): varias líneas de un mismo proveedor, con
// cantidades, puestas en Chile. Envoltura pura sobre `computeCosting`, con los
// costos FIJOS por embarque incluidos (prima mínima de seguro, mínimo del agente
// de aduanas), que sí corresponden cuando se simula la orden completa.
//
// Nada se inventa: sin gasto de origen (precio EXW) ni flete no hay costo, y la
// respuesta dice qué falta. El flete sale de la cotización real del forwarder si
// se ingresó; si no, de la tarifa vigente por unidad cobrable.
import { fromMicros, roundHalfUp } from '../../libs/money'
import { toUsdMicro } from '../../libs/fx'
import { computeCosting } from './engine'
import { airChargeableWeight, seaLclChargeableRt } from './weights'

const EXW = 'EXW'
const FOB_EQUIVALENT_INCOTERMS = ['FOB', 'FCA']
// Partida ficticia para poder modelar el TLC con Form F: la tasa real depende de la
// partida de cada repuesto, que todavía no está definida. Va siempre como no verificado.
const ASSUMED_HS = 'SUPUESTA-TLC'

/**
 * @typedef {Object} OrderLineInput
 * @property {string} lineId
 * @property {import('../../libs/money').Money} unitPrice   Precio unitario que corresponde a la cantidad (tramo aplicado).
 * @property {string|null} incoterm
 * @property {number} qty
 * @property {number} weightG      Peso bruto por unidad.
 * @property {number} volumeCm3    Volumen por unidad.
 * @property {boolean} logisticsConfirmed
 * @property {import('./types').DgProfile} [dgProfile]
 */

/**
 * @param {Object} input
 * @param {OrderLineInput[]} input.lines
 * @param {import('./types').ShippingMode} input.mode
 * @param {number|null} input.originCostBp   Gasto de origen EXW→FOB del proveedor, en bp del precio.
 * @param {'yes'|'no'|'unknown'} input.formF
 * @param {import('./unitCost').UnitCostAssumptions} input.assumptions
 * @param {number|null} [input.freightQuoteUsdMicro]  Flete real cotizado por el forwarder (micros de USD); null = usar la tarifa.
 * @param {import('./types').CostParamSet} input.params
 * @param {import('./types').FxSnapshot} input.fx
 * @returns {{
 *   blockers: string[],
 *   lineBlockers: Record<string, string[]>,
 *   lines: Array<{ lineId: string, qty: number, priceMicro: number, originMicro: number, freightMicro: number, insuranceMicro: number, dutyMicro: number, localCostsMicro: number, landedNetMicro: number, unitLandedNetMicro: number, vatMicro: number }>,
 *   totals: { priceMicro: number, originMicro: number, freightMicro: number, insuranceMicro: number, dutyMicro: number, localCostsMicro: number, landedNetMicro: number, vatMicro: number, cashOutlayMicro: number } | null,
 *   freight: { source: 'quote'|'rate', chargeableUnits: number, unit: string } | null,
 *   warnings: string[],
 *   unverified: string[],
 * }}
 */
export function computeOrderCost(input) {
  const { lines, mode, assumptions, params, fx } = input
  const isAir = mode === 'air' || mode === 'courier'
  const blockers = []
  const lineBlockers = {}
  const empty = { lines: [], totals: null, freight: null, warnings: [], unverified: [] }

  const blockLine = (lineId, reason) => {
    lineBlockers[lineId] = [...(lineBlockers[lineId] ?? []), reason]
  }
  if (lines.length === 0) return { blockers: [], lineBlockers, ...empty }

  // Datos faltantes: se informan, no se rellenan.
  const hasExw = lines.some((l) => l.incoterm === EXW)
  if (hasExw && input.originCostBp == null) blockers.push('Falta el gasto de origen del proveedor')
  const rate = isAir ? assumptions.airUsdPerKgCents : assumptions.seaUsdPerRtCents
  if (input.freightQuoteUsdMicro == null && rate == null) {
    blockers.push(`Falta la tarifa de flete ${isAir ? 'aéreo' : 'marítimo'} o el flete cotizado`)
  }
  for (const l of lines) {
    if (l.incoterm !== EXW && !FOB_EQUIVALENT_INCOTERMS.includes(l.incoterm)) {
      blockLine(
        l.lineId,
        l.incoterm
          ? `Incoterm ${l.incoterm}: todavía no sabemos llevarlo a FOB`
          : 'Sin Incoterm: no se puede costear',
      )
    }
  }
  if (blockers.length > 0 || Object.keys(lineBlockers).length > 0) {
    return { blockers, lineBlockers, ...empty }
  }

  const airDivisor = assumptions.airVolumetricDivisor ?? params.freightDefaults.airVolumetricDivisor
  const generalBp = assumptions.generalDutyBp ?? params.duty.generalAdValoremBp

  const prepared = lines.map((l) => {
    const priceUnitMicro = toUsdMicro(l.unitPrice, fx)
    const originUnitMicro =
      l.incoterm === EXW ? roundHalfUp((priceUnitMicro * input.originCostBp) / 10000) : 0
    const grossWeightG = l.weightG * l.qty
    const volumeCm3 = l.volumeCm3 * l.qty
    const chargeable = isAir
      ? airChargeableWeight(grossWeightG, volumeCm3, airDivisor).chargeableKg
      : seaLclChargeableRt(grossWeightG, volumeCm3, params.freightDefaults.seaLclWmKgPerCbm)
          .chargeableRt
    return { l, priceUnitMicro, originUnitMicro, grossWeightG, volumeCm3, chargeable }
  })

  const chargeableUnits = prepared.reduce((sum, p) => sum + p.chargeable, 0)
  const fromQuote = input.freightQuoteUsdMicro != null
  const freightMicro = fromQuote
    ? input.freightQuoteUsdMicro
    : roundHalfUp((chargeableUnits * 1e6 * rate) / 100)

  const withFormF = input.formF === 'yes'
  const result = computeCosting({
    mode,
    lines: prepared.map((p) => ({
      lineId: p.l.lineId,
      qty: p.l.qty,
      unitFob: fromMicros(p.priceUnitMicro + p.originUnitMicro, 'USD'),
      grossWeightG: p.grossWeightG,
      volumeCm3: p.volumeCm3,
      originCert: withFormF ? 'form_f' : 'none',
      hsCode: withFormF ? ASSUMED_HS : undefined,
      dgProfile: p.l.dgProfile,
    })),
    freightQuote: fromMicros(freightMicro, 'USD'),
    params: {
      ...params,
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

  // Una línea bloqueada por el motor (mercancía peligrosa que no puede ir en el modo elegido).
  for (const line of result.lines.filter((x) => x.blocked)) {
    for (const reason of line.blockReasons) blockLine(line.lineId, reason)
  }
  if (Object.keys(lineBlockers).length > 0) {
    return { blockers: [], lineBlockers, ...empty }
  }

  // El motor arma sus Money con `money(micros, 'USD')`: `amount` viene en micros.
  const byId = new Map(result.lines.map((x) => [x.lineId, x]))
  const outLines = prepared.map((p) => {
    const line = byId.get(p.l.lineId)
    return {
      lineId: p.l.lineId,
      qty: p.l.qty,
      priceMicro: p.priceUnitMicro * p.l.qty,
      originMicro: p.originUnitMicro * p.l.qty,
      freightMicro: line.freight.amount,
      insuranceMicro: line.insurance.amount,
      dutyMicro: line.duty.amount,
      localCostsMicro: line.localCosts.amount,
      landedNetMicro: line.landedNet.amount,
      unitLandedNetMicro: roundHalfUp(line.landedNet.amount / p.l.qty),
      vatMicro: line.vat.amount,
    }
  })
  const sum = (key) => outLines.reduce((acc, x) => acc + x[key], 0)
  const totals = {
    priceMicro: sum('priceMicro'),
    originMicro: sum('originMicro'),
    freightMicro: result.totals.freight.amount,
    insuranceMicro: result.totals.insurance.amount,
    dutyMicro: result.totals.duty.amount,
    localCostsMicro: result.totals.localCosts.amount,
    landedNetMicro: result.totals.landedNet.amount,
    vatMicro: result.totals.vat.amount,
    cashOutlayMicro: result.totals.cashOutlay.amount,
  }

  const unverified = []
  if (hasExw) unverified.push('Gasto de origen sin cotización real de forwarder')
  if (!fromQuote) unverified.push('Flete calculado con la tarifa vigente, no con una cotización')
  if (lines.some((l) => !l.logisticsConfirmed)) unverified.push('Peso y volumen sin confirmar')
  if (input.formF !== 'yes' && input.formF !== 'no') {
    unverified.push('Proveedor sin confirmar si emite Formulario F')
  }
  if (params.verificationStatus?.verifiedAgainstOfficial !== true) {
    unverified.push('Parámetros fiscales sin verificar contra Aduana y SII')
  }

  return {
    blockers: [],
    lineBlockers,
    lines: outLines,
    totals,
    freight: {
      source: fromQuote ? 'quote' : 'rate',
      chargeableUnits,
      unit: isAir ? 'kg cobrables' : 'R/T',
    },
    warnings: result.warnings,
    unverified,
  }
}
