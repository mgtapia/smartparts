// Gastos por embarque llevados a UNA pieza. Los gastos que se cobran por embarque (despacho,
// documentos, reparto, mínimos) se prorratean según la parte del embarque que ocupa la pieza:
// da lo mismo que un embarque lleno solo de esa pieza dividido por la cantidad de piezas.
// Los que se cobran por m³, kg o t·km se aplican directo a lo que cobra la pieza.
// En contenedor completo (FCL) la unidad es el contenedor: la pieza ocupa una parte del
// contenedor (ver ./containers.js) y los gastos por contenedor se le aplican en esa proporción.
// Función pura: montos en micros de USD, sin floats de dinero.
import { roundHalfUp } from '../../libs/money'
import { isFclMode } from './containers'

/**
 * @typedef {Object} ChargeSource
 * @property {string} labelEs
 * @property {string} [url]
 * @property {string} [noteEs]
 */

/** @typedef {'sea'|'air'|'fcl'} ChargeModeKey  'sea' = marítimo LCL, 'fcl' = contenedor completo. */

/**
 * @typedef {Object} ShipmentCharge
 * @property {string} code
 * @property {'inland'|'origin'|'destination'|'customs'|'payment'} stage
 * @property {string} labelEs
 * @property {ChargeModeKey[]} modes
 * @property {'per_shipment'|'per_unit'|'percent_min'|'percent_plus_fixed'|'distance_min'|'container_km'} basis
 *   per_shipment: `amountCents` por embarque. per_unit: `amountCents` por R/T (LCL), kg
 *   cobrable (aéreo) o contenedor (FCL). percent_min: `rateBp` de `base` con mínimo `minCents`
 *   por embarque. percent_plus_fixed: `rateBp` de `base` más `amountCents` fijo por embarque.
 *   distance_min: `rateMicroPerTonKm` × toneladas cobrables de la pieza por carretera × distancia
 *   del proveedor, con mínimo `minCents` por embarque.
 *   container_km: camión por contenedor, `rateMicroPerKm` × distancia del proveedor (mínimo
 *   `minCents` por contenedor), × los contenedores o la parte de uno que ocupa la carga.
 * @property {'price'|'cif'} [base]
 * @property {number} [amountCents]
 * @property {number} [rateBp]
 * @property {number} [minCents]
 * @property {number} [rateMicroPerTonKm]  Micros de USD por tonelada cobrable y km.
 * @property {number} [rateMicroPerKm]     Micros de USD por contenedor y km.
 * @property {ChargeSource} [source]
 */

/**
 * @typedef {Object} UnitCharge
 * @property {string} code
 * @property {string} labelEs
 * @property {number} usdMicro
 * @property {string} formulaEs
 */

/**
 * Qué gastos aplican a un modo de envío: aéreo (y courier), contenedor completo o LCL.
 * @param {import('./types').ShippingMode} mode
 * @returns {ChargeModeKey}
 */
export function chargeModeKey(mode) {
  if (mode === 'air' || mode === 'courier') return 'air'
  return isFclMode(mode) ? 'fcl' : 'sea'
}

const CENT_MICRO = 10_000
const UNIT_LABEL = { air: 'kg cobrable', sea: 'm³ (R/T)', fcl: 'contenedor' }
const SHIPMENT_UNIT = { air: 'kg', sea: 'm³', fcl: 'contenedores' }
const usd = (cents) =>
  `US$ ${(cents / 100).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pct = (bp) => `${(bp / 100).toLocaleString('es-CL')} %`
const qty = (n) => n.toLocaleString('es-CL', { maximumFractionDigits: 4 })

/**
 * Parte del embarque que ocupa una pieza (0–1). Una pieza más grande que el embarque típico
 * es el embarque entero.
 * @param {number} unitChargeable   R/T, kg cobrables o contenedores de la pieza.
 * @param {number} shipmentChargeable  Del embarque típico, en la misma unidad.
 */
export function shipmentShare(unitChargeable, shipmentChargeable) {
  if (!(shipmentChargeable > 0)) return 1
  return Math.min(1, unitChargeable / shipmentChargeable)
}

/**
 * @param {Object} input
 * @param {ShipmentCharge[]} input.charges       Gastos de la etapa (ya filtrados por etapa).
 * @param {boolean} [input.isAir]                Atajo para LCL o aéreo si falta `modeKey`.
 * @param {ChargeModeKey} [input.modeKey]
 * @param {number} input.unitChargeable          R/T (LCL), kg cobrables (aéreo) o contenedores
 *   (FCL, puede ser una fracción) de la pieza.
 * @param {number} input.shipmentChargeable      Del embarque típico, en la misma unidad.
 * @param {{ price?: number, cif?: number }} [input.baseMicro]  Bases de los porcentajes, micros de USD.
 * @param {number} [input.unitTons]              Toneladas cobrables por carretera (el mayor entre t y m³).
 * @param {boolean} [input.withText]  Si es falso no arma los textos de las fórmulas (más rápido).
 * @param {number|null} [input.distanceKm]       Distancia del proveedor al puerto o aeropuerto.
 * @returns {UnitCharge[]}
 */
export function unitShipmentCharges({
  charges,
  isAir = false,
  modeKey: givenModeKey,
  unitChargeable,
  shipmentChargeable,
  baseMicro = {},
  unitTons = 0,
  distanceKm = null,
  withText = true,
}) {
  const modeKey = givenModeKey ?? (isAir ? 'air' : 'sea')
  if (!charges.some((c) => c.modes.includes(modeKey))) return []
  const share = shipmentShare(unitChargeable, shipmentChargeable)
  const unitLabel = UNIT_LABEL[modeKey]
  const shipmentLabel = !withText
    ? ''
    : shipmentChargeable > 0
      ? `${qty(shipmentChargeable)} ${SHIPMENT_UNIT[modeKey]}`
      : 'tamaño sin definir'
  const prorated = (cents) => roundHalfUp(cents * CENT_MICRO * share)
  const shareEs = withText
    ? `la pieza ocupa ${qty(unitChargeable)} de un embarque de ${shipmentLabel}`
    : ''

  return charges
    .filter((c) => c.modes.includes(modeKey))
    .map((c) => {
      const base = baseMicro[c.base ?? 'price'] ?? 0
      const baseEs = c.base === 'cif' ? 'CIF' : 'precio'
      switch (c.basis) {
        case 'per_unit':
          return {
            code: c.code,
            labelEs: c.labelEs,
            usdMicro: roundHalfUp(c.amountCents * CENT_MICRO * unitChargeable),
            formulaEs: withText
              ? `${usd(c.amountCents)} por ${unitLabel} × ${qty(unitChargeable)}`
              : '',
          }
        case 'percent_min': {
          const byRate = roundHalfUp((base * c.rateBp) / 10000)
          return {
            code: c.code,
            labelEs: c.labelEs,
            usdMicro: Math.max(byRate, prorated(c.minCents)),
            formulaEs: withText
              ? `${pct(c.rateBp)} del ${baseEs}, con mínimo de ${usd(c.minCents)} por embarque prorrateado (${shareEs}); se usa el mayor`
              : '',
          }
        }
        case 'percent_plus_fixed':
          return {
            code: c.code,
            labelEs: c.labelEs,
            usdMicro: roundHalfUp((base * c.rateBp) / 10000) + prorated(c.amountCents),
            formulaEs: withText
              ? `${pct(c.rateBp)} del ${baseEs} + ${usd(c.amountCents)} por embarque prorrateado (${shareEs})`
              : '',
          }
        case 'distance_min': {
          const km = distanceKm ?? 0
          const byDistance = roundHalfUp(c.rateMicroPerTonKm * unitTons * km)
          const rateEs = withText
            ? (c.rateMicroPerTonKm / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 3 })
            : ''
          return {
            code: c.code,
            labelEs: c.labelEs,
            usdMicro: Math.max(byDistance, prorated(c.minCents)),
            formulaEs: withText
              ? `US$ ${rateEs} por t·km × ${qty(unitTons)} t cobrables × ${qty(km)} km, con mínimo de ${usd(c.minCents)} por embarque prorrateado (${shareEs}); se usa el mayor`
              : '',
          }
        }
        case 'container_km': {
          const km = distanceKm ?? 0
          const minMicro = (c.minCents ?? 0) * CENT_MICRO
          const perContainer = Math.max(roundHalfUp(c.rateMicroPerKm * km), minMicro)
          const rateEs = withText
            ? (c.rateMicroPerKm / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 3 })
            : ''
          const minEs =
            withText && minMicro > 0 ? `, con mínimo de ${usd(c.minCents)} por contenedor` : ''
          return {
            code: c.code,
            labelEs: c.labelEs,
            usdMicro: roundHalfUp(perContainer * unitChargeable),
            formulaEs: withText
              ? `US$ ${rateEs} por km × ${qty(km)} km por contenedor${minEs}, × ${qty(unitChargeable)} contenedores`
              : '',
          }
        }
        default:
          return {
            code: c.code,
            labelEs: c.labelEs,
            usdMicro: prorated(c.amountCents),
            formulaEs: withText
              ? `${usd(c.amountCents)} por embarque prorrateado (${shareEs})`
              : '',
          }
      }
    })
}
