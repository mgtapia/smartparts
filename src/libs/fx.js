// Conversión de moneda. El motor de costos calcula todo en USD (así liquida
// Aduana Chile); esta capa convierte para mostrar en CLP o normaliza una
// cotización en CNY a USD antes de entrar al motor. Ver docs/MOTOR-DE-COSTOS.md.
import { money, toMicros, fromMicros, roundHalfUp } from './money'

/**
 * Normaliza un Money en USD o CNY a micros USD.
 * @param {import('./money').Money} m
 * @param {import('../core/costing/types').FxSnapshot} fx
 * @returns {number}
 */
export function toUsdMicro(m, fx) {
  if (m.currency === 'USD') return toMicros(m)
  if (m.currency === 'CNY') return roundHalfUp((toMicros(m) * fx.cnyUsd) / 1e6)
  throw new Error(`toUsdMicro: moneda no soportada "${m.currency}" (esperado USD o CNY)`)
}

/**
 * Convierte micros USD a un Money en CLP, para presentación. Es una
 * conversión de un solo número: no participa de las invariantes de suma
 * del motor (esas se verifican en USD, la moneda en la que el motor opera).
 * @param {number} usdMicro
 * @param {import('../core/costing/types').FxSnapshot} fx
 * @returns {import('./money').Money}
 */
export function usdMicroToClp(usdMicro, fx) {
  const clpMicro = roundHalfUp((usdMicro * fx.usdClp) / 1e6)
  return fromMicros(clpMicro, 'CLP')
}

/**
 * Azúcar sobre `usdMicroToClp` para convertir un Money USD ya redondeado.
 * @param {import('./money').Money} usdMoney
 * @param {import('../core/costing/types').FxSnapshot} fx
 * @returns {import('./money').Money}
 */
export function usdToClp(usdMoney, fx) {
  if (usdMoney.currency !== 'USD') throw new Error('usdToClp: se esperaba un Money en USD')
  return usdMicroToClp(toMicros(usdMoney), fx)
}

/**
 * Inversa de `usdToClp` — para comparar un baseline en CLP contra
 * cotizaciones en USD en la misma moneda (ver Catálogo).
 * @param {import('./money').Money} clpMoney
 * @param {import('../core/costing/types').FxSnapshot} fx
 * @returns {import('./money').Money}
 */
export function clpToUsd(clpMoney, fx) {
  if (clpMoney.currency !== 'CLP') throw new Error('clpToUsd: se esperaba un Money en CLP')
  const usdMicro = roundHalfUp((toMicros(clpMoney) * 1e6) / fx.usdClp)
  return fromMicros(usdMicro, 'USD')
}

export { money }
