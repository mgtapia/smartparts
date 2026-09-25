// Costo unitario de UNA pieza, desde el precio del proveedor hasta el costo
// final en Chile. Envoltura pura sobre `computeCosting` (mismas fórmulas de
// arancel, seguro e IVA), con 1 unidad. Los gastos que se cobran por embarque
// (despacho, reparto, mínimos) se prorratean sobre un embarque típico según la
// parte que ocupa la pieza (ver ./shipmentCharges.js): lo mismo que un
// embarque lleno de esa pieza dividido por la cantidad de piezas. El costo de
// un pedido real es la simulación por cantidades (otra sección).
//
// Nada de lo que devuelve es "definitivo": cada componente informa su fórmula
// y si está verificado. Tarifas, gastos y arancel TLC son referencias públicas
// o estimaciones del equipo hasta tener cotizaciones reales.
import { money, fromMicros, roundHalfUp } from '../../libs/money'
import { toUsdMicro } from '../../libs/fx'
import { computeCosting } from './engine'
import { airChargeableWeight, seaLclChargeableRt } from './weights'
import { chargeModeKey, unitShipmentCharges } from './shipmentCharges'
import { containerShare, isFclMode } from './containers'

const EXW = 'EXW'
const FOB_EQUIVALENT_INCOTERMS = ['FOB', 'FCA']

// Partida ficticia: el TLC Chile-China depende de la partida arancelaria (HS
// code), que todavía no tenemos por repuesto. Para poder modelar "proveedor
// que sí emite Form F" se registra una tasa TLC supuesta bajo esta partida y
// se pasa siempre marcada como no verificada.
const ASSUMED_HS = 'SUPUESTA-TLC'

/**
 * @typedef {Object} UnitCostAssumptions
 * @property {number|null} airUsdPerKgCents   Tarifa aérea, centavos de USD por kg cobrable; null = sin dato.
 * @property {number|null} seaUsdPerRtCents   Tarifa marítima LCL, centavos de USD por R/T (m³ o t); null = sin dato.
 * @property {number} [airVolumetricDivisor]  cm³ por kg para el peso volumétrico aéreo; si falta, el del set de parámetros.
 * @property {number} [generalDutyBp]    Arancel general (sin Form F), en bp; si falta, el del set de parámetros.
 * @property {number} ftaDutyBp          Arancel con TLC (solo con Form F), en basis points.
 * @property {import('./shipmentCharges').ShipmentCharge[]} [shipmentCharges]  Gastos por etapa (transporte en China, exportación, Chile, aduana, pago).
 * @property {number} [seaShipmentRt]  Embarque típico marítimo, en R/T (m³), para prorratear los gastos por embarque.
 * @property {number} [airShipmentKg]  Embarque típico aéreo, en kg cobrables.
 * @property {Record<string, import('./containers').ContainerSpec>} [fclContainers]  Flete y
 *   capacidad por tipo de contenedor, con la clave del modo (`sea_fcl_20`, `sea_fcl_40hq`).
 * @property {number} [fclShipmentContainers]  Embarque típico en contenedor completo, en
 *   contenedores: sobre él se prorratean los gastos por embarque.
 */

/**
 * @typedef {Object} CostComponent
 * @property {string} code
 * @property {string} labelEs
 * @property {number} usdMicro     Monto por unidad en micros de USD.
 * @property {string} formulaEs    Cómo se calcula, con los valores usados.
 * @property {boolean} verified    false → mostrar en rojo.
 * @property {string} [reasonEs]   Por qué no está verificado.
 * @property {import('./shipmentCharges').UnitCharge[]} [items]  Detalle de gastos que suma el componente.
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
const usd = (micro) =>
  `US$ ${(micro / 1e6).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Transporte en China de un proveedor sin distancia: el mayor entre un % del precio y el
 * transporte con la distancia promedio de los proveedores con dato. Conservador a propósito:
 * con cero, el proveedor sin datos saldría más barato que los que sí los tienen.
 * @param {(km: number) => import('./shipmentCharges').UnitCharge[]} inlandAt
 * @param {number} priceUsdMicro
 * @param {{ bp: number, averageKm: number|null }} fallback
 * @returns {import('./shipmentCharges').UnitCharge[]}
 */
function inlandFallback(inlandAt, priceUsdMicro, fallback) {
  const byPriceMicro = roundHalfUp((priceUsdMicro * fallback.bp) / 10000)
  const [byAverage] = fallback.averageKm != null ? inlandAt(fallback.averageKm) : []
  if (!byAverage) {
    return [
      {
        code: 'inland_china',
        labelEs: 'Transporte en China, sin distancia del proveedor',
        usdMicro: byPriceMicro,
        formulaEs: `${pct(fallback.bp)} del precio EXW (${usd(byPriceMicro)}): no hay distancias de otros proveedores para promediar`,
      },
    ]
  }
  return [
    {
      ...byAverage,
      labelEs: 'Transporte en China, sin distancia del proveedor',
      usdMicro: Math.max(byPriceMicro, byAverage.usdMicro),
      formulaEs: `el mayor entre ${pct(fallback.bp)} del precio EXW (${usd(byPriceMicro)}) y el transporte con la distancia promedio de los proveedores con dato, ${Math.round(fallback.averageKm).toLocaleString('es-CL')} km (${usd(byAverage.usdMicro)}: ${byAverage.formulaEs})`,
    },
  ]
}

/**
 * @param {Object} input
 * @param {import('../../libs/money').Money} input.unitPrice   Precio unitario del proveedor.
 * @param {string|null} input.incoterm
 * @param {boolean} [input.incotermAssumed]  El Incoterm no viene de la cotización: es un supuesto.
 * @param {number|null} input.originDistanceKm  Distancia de ESTE proveedor al puerto (marítimo) o aeropuerto (aéreo), en km.
 * @param {boolean} [input.originDistanceConfirmed]  ¿La distancia tiene fuente?
 * @param {{ bp: number, averageKm: number|null }} [input.originFallback]  Sin distancia del
 *   proveedor: se cobra el mayor entre `bp` del precio y el transporte con `averageKm` (promedio
 *   de los proveedores con dato). Sin esto, falta de distancia es un bloqueo.
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

  const isAir = mode === 'air' || mode === 'courier'
  const isFcl = isFclMode(mode)
  const modeKey = chargeModeKey(mode)
  const container = isFcl ? assumptions.fclContainers?.[mode] : null
  // Sin dato no se inventa: se informa qué falta para poder calcular.
  const missing = []
  if (isExw && input.originDistanceKm == null && !input.originFallback) {
    missing.push(
      `Falta la distancia del proveedor al ${isAir ? 'aeropuerto' : 'puerto'}: se carga en su ficha`,
    )
  }
  if (isFcl) {
    if (!(
      container?.freightCents != null &&
      container.capacityM3 > 0 &&
      container.capacityKg > 0
    )) {
      missing.push('Falta el flete o la capacidad del contenedor')
    }
  } else if ((isAir ? assumptions.airUsdPerKgCents : assumptions.seaUsdPerRtCents) == null) {
    missing.push(`Falta la tarifa de flete ${isAir ? 'aéreo' : 'marítimo'}`)
  }
  if (missing.length > 0) return { blockers: missing, components: [], landedNetUsdMicro: null }

  const priceUsdMicro = toUsdMicro(unitPrice, fx)

  // Unidades cobrables de la pieza: aéreo cobra el MAYOR entre el peso real y el volumétrico
  // (volumen ÷ divisor); marítimo LCL, el mayor entre toneladas y m³. Por carretera se cobra
  // como marítimo (el mayor entre t y m³). En contenedor completo, la parte del contenedor que
  // ocupa la pieza: el mayor entre su volumen y su peso sobre la capacidad útil.
  const airDivisor = assumptions.airVolumetricDivisor ?? params.freightDefaults.airVolumetricDivisor
  const seaRt = seaLclChargeableRt(weightG, volumeCm3, params.freightDefaults.seaLclWmKgPerCbm)
  const fclShare = isFcl ? containerShare(weightG, volumeCm3, container) : null
  const chargeable = isAir ? airChargeableWeight(weightG, volumeCm3, airDivisor) : seaRt
  const chargeableUnits = isFcl
    ? fclShare.share
    : isAir
      ? chargeable.chargeableKg
      : chargeable.chargeableRt
  const shipmentChargeable = isFcl
    ? (assumptions.fclShipmentContainers ?? 1)
    : isAir
      ? assumptions.airShipmentKg
      : assumptions.seaShipmentRt

  // Gastos por etapa (SHIPMENT_CHARGES), prorrateados sobre el embarque típico del modo.
  const shipmentCharges = assumptions.shipmentCharges ?? []
  const chargesOf = (stage, extra) =>
    unitShipmentCharges({
      charges: shipmentCharges.filter((c) => c.stage === stage),
      modeKey,
      unitChargeable: chargeableUnits,
      shipmentChargeable,
      ...extra,
    })
  const sumOf = (list) => list.reduce((acc, c) => acc + c.usdMicro, 0)

  // 1) Origen (solo EXW): transporte en China según la distancia de ESTE proveedor y el peso o
  //    volumen de la pieza, y los gastos de exportación. Ambos son parte del FOB. Se redondean
  //    a centavos: el motor recibe el FOB en centavos, y así CIF = FOB + flete + seguro cuadra
  //    exacto con lo que se muestra.
  const toCents = (micro) => roundHalfUp(micro / 10_000) * 10_000
  const inCents = (list) => list.map((c) => ({ ...c, usdMicro: toCents(c.usdMicro) }))
  const inlandAt = (distanceKm) => chargesOf('inland', { unitTons: seaRt.chargeableRt, distanceKm })
  const usesFallback = isExw && input.originDistanceKm == null
  const inlandCharges = !isExw
    ? []
    : inCents(
        usesFallback
          ? inlandFallback(inlandAt, priceUsdMicro, input.originFallback)
          : inlandAt(input.originDistanceKm),
      )
  const originCharges = isExw
    ? inCents(chargesOf('origin', { baseMicro: { price: priceUsdMicro } }))
    : []
  const inlandMicro = sumOf(inlandCharges)
  const originChargesMicro = sumOf(originCharges)
  const fobMicro = priceUsdMicro + inlandMicro + originChargesMicro

  // 2) Flete unitario: unidades cobrables × tarifa (en FCL, parte del contenedor × flete por
  //    contenedor).
  const rateCents = isFcl
    ? container.freightCents
    : isAir
      ? assumptions.airUsdPerKgCents
      : assumptions.seaUsdPerRtCents
  const freightMicro = roundHalfUp((chargeableUnits * 1e6 * rateCents) / 100)

  // 3) Arancel: con Form F usamos la tasa TLC supuesta (vía la partida
  //    ficticia); sin él, el arancel general.
  const withFormF = input.formF === 'yes'
  const generalBp = assumptions.generalDutyBp ?? params.duty.generalAdValoremBp
  const dutyParams = {
    ...params.duty,
    generalAdValoremBp: generalBp,
    rateOverridesByHs: {
      ...params.duty.rateOverridesByHs,
      [ASSUMED_HS]: { generalBp, ftaBp: assumptions.ftaDutyBp },
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
    // Los gastos en Chile salen de SHIPMENT_CHARGES, no de los gastos locales del set de parámetros.
    params: { ...stripShipmentFixedCosts(params), localCosts: [], duty: dutyParams },
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
  const unitLabel = isFcl ? 'contenedores' : isAir ? 'kg cobrables' : 'R/T (m³ o t)'
  const fclBasisEs = fclShare?.basis === 'weight' ? 'por peso' : 'por volumen'
  const basisEs = isFcl ? fclBasisEs : chargeable.basis === 'volumetric' ? 'volumétrico' : 'real'
  const fclBasisTextEs = isFcl
    ? `Contenedor completo de ${container.capacityM3} m³ útiles y ${container.capacityKg.toLocaleString('es-CL')} kg: la pieza paga la parte que ocupa, el mayor entre su volumen (${(volumeCm3 / 1e6).toFixed(4)} m³) y su peso (${(weightG / 1000).toFixed(3)} kg).`
    : ''
  const freightBasisEs = isFcl
    ? fclBasisTextEs
    : isAir
      ? `Aéreo cobra el mayor entre el peso real (${(weightG / 1000).toFixed(3)} kg) y el volumétrico (${(volumeCm3 / airDivisor).toFixed(3)} kg = ${volumeCm3} cm³ ÷ ${airDivisor}).`
      : `Marítimo LCL cobra el mayor entre el peso (${(weightG / 1e6).toFixed(4)} t) y el volumen (${(volumeCm3 / 1e6).toFixed(4)} m³).`
  const dutyRateBp = withFormF ? assumptions.ftaDutyBp : generalBp

  // 4) Después del CIF: gastos en Chile (puerto o aeropuerto, reparto y agente de aduanas) y la
  //    transferencia bancaria al proveedor. No son base del arancel ni del IVA de importación.
  const cifBase = { baseMicro: { cif: line.cif.amount } }
  const localCharges = [...chargesOf('destination', cifBase), ...chargesOf('customs', cifBase)]
  const paymentCharges = chargesOf('payment', { baseMicro: { price: priceUsdMicro } })
  const localMicro = sumOf(localCharges)
  const bankMicro = sumOf(paymentCharges)
  const landedNetMicro = line.landedNet.amount + localMicro + bankMicro
  const itemsEs = (list) => list.map((c) => `${c.labelEs}: ${c.formulaEs}`).join('. ')
  const chargesReason =
    'referencias públicas, sin cotización real de forwarder ni agente de aduanas'
  const notFob = 'No aplica: el precio ya es FOB/FCA.'

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
      labelEs: 'Transporte en China',
      usdMicro: inlandMicro,
      formulaEs: isExw
        ? `${itemsEs(inlandCharges)}. Depende de la distancia de cada proveedor y del peso o volumen de la pieza, no de su precio.`
        : notFob,
      verified: !isExw && !input.incotermAssumed,
      reasonEs: join(
        isExw ? 'tarifa de referencia, sin cotización real' : undefined,
        usesFallback
          ? 'sin distancia del proveedor: supuesto conservador hasta cargarla en su ficha'
          : isExw && !input.originDistanceConfirmed
            ? 'distancia estimada, sin fuente'
            : undefined,
        input.incotermAssumed ? 'Incoterm supuesto: la cotización no lo indica' : undefined,
        isExw ? logisticsReason : undefined,
      ),
      items: inlandCharges,
    },
    {
      code: 'originCharges',
      labelEs: 'Gastos de exportación',
      usdMicro: originChargesMicro,
      formulaEs: isExw ? `${itemsEs(originCharges)}. Son parte del FOB.` : notFob,
      verified: !isExw,
      reasonEs: isExw ? chargesReason : undefined,
      items: originCharges,
    },
    {
      code: 'freight',
      labelEs: 'Flete internacional',
      usdMicro: line.freight.amount,
      formulaEs: `${freightBasisEs} Cobra ${chargeableUnits.toFixed(isFcl ? 6 : 4)} ${unitLabel} (${basisEs}) × US$ ${(rateCents / 100).toFixed(2)} por ${isFcl ? 'contenedor' : isAir ? 'kg' : 'R/T'}. Tarifa estimada.`,
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
        'FOB (precio + transporte en China + gastos de exportación) + flete + seguro. Base sobre la que Aduana calcula el arancel.',
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
      labelEs: 'Gastos en Chile',
      usdMicro: localMicro,
      formulaEs: `${itemsEs(localCharges)}.`,
      verified: false,
      reasonEs: chargesReason,
      items: localCharges,
    },
    {
      code: 'bank',
      labelEs: 'Transferencia bancaria',
      usdMicro: bankMicro,
      formulaEs: `${itemsEs(paymentCharges)}.`,
      verified: false,
      reasonEs: 'tarifa publicada del banco, sin confirmar con el banco que se use',
      items: paymentCharges,
    },
    {
      code: 'landedNet',
      labelEs: 'Costo final (sin IVA)',
      usdMicro: landedNetMicro,
      formulaEs:
        'CIF + arancel + gastos en Chile + transferencia bancaria. El IVA no se suma: es crédito fiscal recuperable.',
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

  return { blockers: [], components, landedNetUsdMicro: landedNetMicro }
}
