// Gastos por embarque llevados a UNA pieza. Los gastos que se cobran por embarque (despacho,
// documentos, reparto, mínimos) se prorratean según la parte del embarque que ocupa la pieza:
// da lo mismo que un embarque lleno solo de esa pieza dividido por la cantidad de piezas.
// Los que se cobran por m³, kg o t·km se aplican directo a lo que cobra la pieza.
// Función pura: montos en micros de USD, sin floats de dinero.
import { roundHalfUp } from '../../libs/money'

/**
 * @typedef {Object} ChargeSource
 * @property {string} labelEs
 * @property {string} [url]
 * @property {string} [noteEs]
 */

/**
 * @typedef {Object} ShipmentCharge
 * @property {string} code
 * @property {'inland'|'origin'|'destination'|'customs'|'payment'} stage
 * @property {string} labelEs
 * @property {Array<'sea'|'air'>} modes
 * @property {'per_shipment'|'per_unit'|'percent_min'|'percent_plus_fixed'|'distance_min'} basis
 *   per_shipment: `amountCents` por embarque. per_unit: `amountCents` por R/T (marítimo) o kg
 *   cobrable (aéreo). percent_min: `rateBp` de `base` con mínimo `minCents` por embarque.
 *   percent_plus_fixed: `rateBp` de `base` más `amountCents` fijo por embarque.
 *   distance_min: `rateMicroPerTonKm` × toneladas cobrables de la pieza por carretera × distancia
 *   del proveedor, con mínimo `minCents` por embarque.
 * @property {'price'|'cif'} [base]
 * @property {number} [amountCents]
 * @property {number} [rateBp]
 * @property {number} [minCents]
 * @property {number} [rateMicroPerTonKm]  Micros de USD por tonelada cobrable y km.
 * @property {ChargeSource} [source]
 */

/**
 * @typedef {Object} UnitCharge
 * @property {string} code
 * @property {string} labelEs
 * @property {number} usdMicro
 * @property {string} formulaEs
 */

const CENT_MICRO = 10_000
const usd = (cents) =>
  `US$ ${(cents / 100).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pct = (bp) => `${(bp / 100).toLocaleString('es-CL')} %`
const qty = (n) => n.toLocaleString('es-CL', { maximumFractionDigits: 4 })

/**
 * Parte del embarque que ocupa una pieza (0–1). Una pieza más grande que el embarque típico
 * es el embarque entero.
 * @param {number} unitChargeable   R/T o kg cobrables de la pieza.
 * @param {number} shipmentChargeable  R/T o kg cobrables del embarque típico.
 */
export function shipmentShare(unitChargeable, shipmentChargeable) {
  if (!(shipmentChargeable > 0)) return 1
  return Math.min(1, unitChargeable / shipmentChargeable)
}

/**
 * @param {Object} input
 * @param {ShipmentCharge[]} input.charges       Gastos de la etapa (ya filtrados por etapa).
 * @param {boolean} input.isAir
 * @param {number} input.unitChargeable          R/T (marítimo) o kg cobrables (aéreo) de la pieza.
 * @param {number} input.shipmentChargeable      Del embarque típico, en la misma unidad.
 * @param {{ price?: number, cif?: number }} [input.baseMicro]  Bases de los porcentajes, micros de USD.
 * @param {number} [input.unitTons]              Toneladas cobrables por carretera (el mayor entre t y m³).
 * @param {number|null} [input.distanceKm]       Distancia del proveedor al puerto o aeropuerto.
 * @returns {UnitCharge[]}
 */
export function unitShipmentCharges({
  charges,
  isAir,
  unitChargeable,
  shipmentChargeable,
  baseMicro = {},
  unitTons = 0,
  distanceKm = null,
}) {
  const modeKey = isAir ? 'air' : 'sea'
  if (!charges.some((c) => c.modes.includes(modeKey))) return []
  const share = shipmentShare(unitChargeable, shipmentChargeable)
  const unitLabel = isAir ? 'kg cobrable' : 'm³ (R/T)'
  const shipmentLabel =
    shipmentChargeable > 0
      ? `${qty(shipmentChargeable)} ${isAir ? 'kg' : 'm³'}`
      : 'tamaño sin definir'
  const prorated = (cents) => roundHalfUp(cents * CENT_MICRO * share)
  const shareEs = `la pieza ocupa ${qty(unitChargeable)} de un embarque de ${shipmentLabel}`

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
            formulaEs: `${usd(c.amountCents)} por ${unitLabel} × ${qty(unitChargeable)}`,
          }
        case 'percent_min': {
          const byRate = roundHalfUp((base * c.rateBp) / 10000)
          return {
            code: c.code,
            labelEs: c.labelEs,
            usdMicro: Math.max(byRate, prorated(c.minCents)),
            formulaEs: `${pct(c.rateBp)} del ${baseEs}, con mínimo de ${usd(c.minCents)} por embarque prorrateado (${shareEs}); se usa el mayor`,
          }
        }
        case 'percent_plus_fixed':
          return {
            code: c.code,
            labelEs: c.labelEs,
            usdMicro: roundHalfUp((base * c.rateBp) / 10000) + prorated(c.amountCents),
            formulaEs: `${pct(c.rateBp)} del ${baseEs} + ${usd(c.amountCents)} por embarque prorrateado (${shareEs})`,
          }
        case 'distance_min': {
          const km = distanceKm ?? 0
          const byDistance = roundHalfUp(c.rateMicroPerTonKm * unitTons * km)
          const rateEs = (c.rateMicroPerTonKm / 1e6).toLocaleString('es-CL', {
            maximumFractionDigits: 3,
          })
          return {
            code: c.code,
            labelEs: c.labelEs,
            usdMicro: Math.max(byDistance, prorated(c.minCents)),
            formulaEs: `US$ ${rateEs} por t·km × ${qty(unitTons)} t cobrables × ${qty(km)} km, con mínimo de ${usd(c.minCents)} por embarque prorrateado (${shareEs}); se usa el mayor`,
          }
        }
        default:
          return {
            code: c.code,
            labelEs: c.labelEs,
            usdMicro: prorated(c.amountCents),
            formulaEs: `${usd(c.amountCents)} por embarque prorrateado (${shareEs})`,
          }
      }
    })
}
