// Costo unitario de UNA pieza, desde el precio del proveedor hasta el costo
// final en Chile. Envoltura pura sobre `computeCosting` (mismas fórmulas de
// arancel, seguro y gastos), con 1 unidad y sin los costos FIJOS por embarque
// (mínimo del agente de aduanas, prima mínima de seguro): esos no se pueden
// repartir por unidad sin inventar un tamaño de embarque, e inflarían cada
// pieza suelta. El costo real de un embarque completo es la simulación por
// cantidades (otra sección).
//
// Nada de lo que devuelve es "definitivo": cada componente informa su fórmula
// y si está verificado. Los supuestos (costo de origen, tarifas de flete,
// arancel TLC) son estimaciones del equipo hasta tener cotizaciones reales.
import { money, fromMicros, roundHalfUp } from '../../libs/money'
import { toUsdMicro } from '../../libs/fx'
import { computeCosting } from './engine'
import { airChargeableWeight, seaLclChargeableRt } from './weights'

const EXW = 'EXW'
const FOB_EQUIVALENT_INCOTERMS = ['FOB', 'FCA']

// Partida ficticia: el TLC Chile-China depende de la partida arancelaria (HS
// code), que todavía no tenemos por repuesto. Para poder modelar "proveedor
// que sí emite Form F" se registra una tasa TLC supuesta bajo esta partida y
// se pasa siempre marcada como no verificada.
const ASSUMED_HS = 'SUPUESTA-TLC'

/**
 * @typedef {Object} UnitCostAssumptions
 * @property {number} airUsdPerKgCents   Tarifa aérea, centavos de USD por kg cobrable.
 * @property {number} seaUsdPerRtCents   Tarifa marítima LCL, centavos de USD por R/T (m³ o t).
 * @property {number} ftaDutyBp          Arancel supuesto con TLC (Form F), en basis points.
 */

/**
 * @typedef {Object} CostComponent
 * @property {string} code
 * @property {string} labelEs
 * @property {number} usdMicro     Monto por unidad en micros de USD.
 * @property {string} formulaEs    Cómo se calcula, con los valores usados.
 * @property {boolean} verified    false → mostrar en rojo.
 * @property {string} [reasonEs]   Por qué no está verificado.
 */

/**
 * Quita del set de parámetros los costos que son por embarque y no por unidad.
 * @param {import('./types').CostParamSet} params
 * @returns {import('./types').CostParamSet}
 */
export function stripShipmentFixedCosts(params) {
  const zero = money(0, 'USD')
  return {
    ...params,
    insurance: { ...params.insurance, minPremium: zero },
    localCosts: params.localCosts
      .filter((c) => c.type !== 'fixed')
      .map((c) => (c.type === 'percent_with_min' ? { ...c, min: zero } : c)),
  }
}

const pct = (bp) => `${(bp / 100).toLocaleString('es-CL')} %`

/**
 * @param {Object} input
 * @param {import('../../libs/money').Money} input.unitPrice   Precio unitario del proveedor.
 * @param {string|null} input.incoterm
 * @param {number} input.originCostBp     Costo de origen EXW→FOB de ESTE proveedor, en bp del precio.
 * @param {'yes'|'no'|'unknown'} input.formF   ¿El proveedor emite Form F?
 * @param {number} input.weightG          Peso bruto por unidad (g).
 * @param {number} input.volumeCm3        Volumen por unidad (cm³).
 * @param {boolean} input.logisticsConfirmed  ¿Peso/volumen confirmados?
 * @param {import('./types').ShippingMode} input.mode
 * @param {UnitCostAssumptions} input.assumptions
 * @param {import('./types').CostParamSet} input.params
 * @param {import('./types').FxSnapshot} input.fx
 * @returns {{ blockers: string[], components: CostComponent[], landedNetUsdMicro: number|null }}
 */
export function computeUnitCost(input) {
  const { unitPrice, incoterm, weightG, volumeCm3, mode, assumptions, params, fx } = input

  const isExw = incoterm === EXW
  if (!isExw && !FOB_EQUIVALENT_INCOTERMS.includes(incoterm)) {
    return {
      blockers: [
        incoterm
          ? `Incoterm ${incoterm}: todavía no sabemos llevarlo a FOB`
          : 'Sin Incoterm: no se puede costear ni comparar',
      ],
      components: [],
      landedNetUsdMicro: null,
    }
  }

  const priceUsdMicro = toUsdMicro(unitPrice, fx)

  // 1) Costo de origen (solo EXW): % del precio, específico del proveedor.
  const originMicro = isExw ? roundHalfUp((priceUsdMicro * input.originCostBp) / 10000) : 0
  const fobMicro = priceUsdMicro + originMicro

  // 2) Flete unitario: unidades cobrables × tarifa.
  const isAir = mode === 'air' || mode === 'courier'
  const chargeable = isAir
    ? airChargeableWeight(weightG, volumeCm3, params.freightDefaults.airVolumetricDivisor)
    : seaLclChargeableRt(weightG, volumeCm3, params.freightDefaults.seaLclWmKgPerCbm)
  const chargeableUnits = isAir ? chargeable.chargeableKg : chargeable.chargeableRt
  const rateCents = isAir ? assumptions.airUsdPerKgCents : assumptions.seaUsdPerRtCents
  const freightMicro = roundHalfUp((chargeableUnits * 1e6 * rateCents) / 100)

  // 3) Arancel: con Form F usamos la tasa TLC supuesta (vía la partida
  //    ficticia); sin él, el arancel general.
  const withFormF = input.formF === 'yes'
  const dutyParams = {
    ...params.duty,
    rateOverridesByHs: {
      ...params.duty.rateOverridesByHs,
      [ASSUMED_HS]: { generalBp: params.duty.generalAdValoremBp, ftaBp: assumptions.ftaDutyBp },
    },
  }

  const result = computeCosting({
    mode,
    lines: [
      {
        lineId: 'unit',
        qty: 1,
        unitFob: fromMicros(fobMicro, 'USD'),
        grossWeightG: weightG,
        volumeCm3,
        originCert: withFormF ? 'form_f' : 'none',
        hsCode: withFormF ? ASSUMED_HS : undefined,
      },
    ],
    freightQuote: fromMicros(freightMicro, 'USD'),
    params: { ...stripShipmentFixedCosts(params), duty: dutyParams },
    fx,
    options: { insured: true },
  })

  if (result.blockers.length > 0) {
    return { blockers: result.blockers, components: [], landedNetUsdMicro: null }
  }

  // OJO: el motor arma sus Money con `money(micros, 'USD')`, es decir `amount`
  // ya viene en micros de USD (no en centavos, aunque el scale diga 2). Acá se
  // lee `.amount` como micros a propósito.
  const line = result.lines[0]
  const paramsVerified = params.verificationStatus?.verifiedAgainstOfficial === true
  const paramsReason = paramsVerified
    ? undefined
    : 'parámetros fiscales sin verificar contra Aduana/SII'
  const logisticsReason = input.logisticsConfirmed ? undefined : 'peso/volumen sin confirmar'
  const join = (...reasons) => reasons.filter(Boolean).join('; ') || undefined
  const unitLabel = isAir ? 'kg cobrables' : 'R/T (m³ o t)'
  const basisEs = chargeable.basis === 'volumetric' ? 'volumétrico' : 'real'
  const dutyRateBp = withFormF ? assumptions.ftaDutyBp : params.duty.generalAdValoremBp

  /** @type {CostComponent[]} */
  const components = [
    {
      code: 'price',
      labelEs: 'Precio proveedor',
      usdMicro: priceUsdMicro,
      formulaEs: `Precio cotizado (${unitPrice.currency}) ${unitPrice.currency === 'USD' ? 'ya en USD' : 'llevado a USD con el tipo de cambio de referencia'}.`,
      verified: unitPrice.currency === 'USD',
      reasonEs: unitPrice.currency === 'USD' ? undefined : 'moneda y tipo de cambio sin confirmar',
    },
    {
      code: 'origin',
      labelEs: 'Costo de origen',
      usdMicro: originMicro,
      formulaEs: isExw
        ? `Precio EXW × ${pct(input.originCostBp)} (transporte interno hasta el puerto, despacho de exportación y manejo en origen). Depende de dónde está el proveedor. Estimación del equipo.`
        : 'No aplica: el precio ya es FOB/FCA.',
      verified: !isExw,
      reasonEs: isExw ? 'estimación sin cotización real de forwarder' : undefined,
    },
    {
      code: 'freight',
      labelEs: 'Flete internacional',
      usdMicro: line.freight.amount,
      formulaEs: `${chargeable.basis === 'volumetric' ? 'Volumen' : 'Peso'} ${basisEs}: ${chargeableUnits.toFixed(4)} ${unitLabel} × US$ ${(rateCents / 100).toFixed(2)} por ${isAir ? 'kg' : 'R/T'}. Tarifa estimada.`,
      verified: false,
      reasonEs: join('tarifa sin cotización real de forwarder', logisticsReason),
    },
    {
      code: 'insurance',
      labelEs: 'Seguro',
      usdMicro: line.insurance.amount,
      formulaEs: `(FOB + flete) × (1 + ${pct(params.insurance.markupBp)}) × ${pct(params.insurance.rateBp)}. Sin la prima mínima por embarque.`,
      verified: false,
      reasonEs: join('tasa de seguro referencial', logisticsReason),
    },
    {
      code: 'cif',
      labelEs: 'CIF',
      usdMicro: line.cif.amount,
      formulaEs:
        'FOB (precio + origen) + flete + seguro. Base sobre la que Aduana calcula el arancel.',
      verified: false,
      reasonEs: 'suma de componentes estimados',
    },
    {
      code: 'duty',
      labelEs: 'Arancel',
      usdMicro: line.duty.amount,
      formulaEs: withFormF
        ? `CIF × ${pct(dutyRateBp)} (tasa TLC supuesta: el proveedor emitiría Form F; la tasa real depende de la partida arancelaria).`
        : `CIF × ${pct(dutyRateBp)} (arancel general). Con Form F válido y partida elegible el TLC Chile-China podría bajarlo; sin confirmar no se asume.`,
      verified: false,
      reasonEs: withFormF
        ? 'Form F y tasa por partida sin confirmar'
        : join(
            paramsReason,
            input.formF === 'unknown' ? 'proveedor sin confirmar si emite Form F' : undefined,
          ),
    },
    {
      code: 'localCosts',
      labelEs: 'Gastos locales',
      usdMicro: line.localCosts.amount,
      formulaEs: `${params.localCosts
        .filter((c) => c.type !== 'fixed')
        .map((c) => `${c.labelEs} ${c.rateBp !== undefined ? pct(c.rateBp) : ''}`.trim())
        .join(' + ')} del CIF. Sin los mínimos por embarque.`,
      verified: false,
      reasonEs: paramsReason ?? 'estimación sin validar con el agente de aduanas',
    },
    {
      code: 'landedNet',
      labelEs: 'Costo final (sin IVA)',
      usdMicro: line.landedNet.amount,
      formulaEs:
        'CIF + arancel + gastos locales. El IVA no se suma: es crédito fiscal recuperable.',
      verified: false,
      reasonEs: 'suma de componentes estimados',
    },
    {
      code: 'vat',
      labelEs: 'IVA (recuperable)',
      usdMicro: line.vat.amount,
      formulaEs: `(CIF + arancel) × ${pct(params.vat.rateBp)}. Sale de caja en el despacho y se recupera como crédito.`,
      verified: false,
      reasonEs: paramsReason ?? 'sin verificar',
    },
  ]

  return { blockers: [], components, landedNetUsdMicro: line.landedNet.amount }
}
