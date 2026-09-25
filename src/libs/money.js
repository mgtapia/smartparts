// Convención de dinero del proyecto — ver docs/MOTOR-DE-COSTOS.md.
// Regla dura: NUNCA un float para plata. Todo importe es un entero en la
// unidad menor de su moneda (centavos para USD/CNY, pesos enteros para CLP),
// acompañado de su código de moneda. Esta capa es la ÚNICA que hace
// aritmética de dinero en el proyecto.

/**
 * @typedef {Object} Money
 * @property {number} amount    Entero en la unidad menor de `currency`.
 * @property {string} currency  ISO-4217 ('CLP', 'USD', 'CNY').
 * @property {number} scale     Decimales de la moneda (CLP=0, USD=2, CNY=2).
 */

/** @type {Record<string, number>} */
export const CURRENCY_SCALE = Object.freeze({ CLP: 0, USD: 2, CNY: 2, EUR: 2 })

/**
 * @param {number} amount
 * @param {string} currency
 * @returns {Money}
 */
export function money(amount, currency) {
  const scale = CURRENCY_SCALE[currency]
  if (scale === undefined) throw new Error(`Moneda desconocida: ${currency}`)
  if (!Number.isInteger(amount)) {
    throw new Error(`money(): amount debe ser entero (unidad menor), recibido ${amount}`)
  }
  return { amount, currency, scale }
}

/**
 * Convierte un Money a "micros" (enteros, 10^-6 de unidad de moneda) para
 * que el motor de costos calcule siempre en enteros, sin importar el scale
 * original de cada moneda.
 * @param {Money} m
 * @returns {number}
 */
export function toMicros(m) {
  assertSafeMicros(m.amount)
  // amount está en unidad menor (scale decimales); micros = 10^6 de la unidad mayor.
  return m.amount * 10 ** (6 - m.scale)
}

/**
 * @param {number} micros
 * @param {string} currency
 * @param {'half_up'} [mode]
 * @returns {Money}
 */
export function fromMicros(micros, currency, mode = 'half_up') {
  const scale = CURRENCY_SCALE[currency]
  if (scale === undefined) throw new Error(`Moneda desconocida: ${currency}`)
  const divisor = 10 ** (6 - scale)
  const amount = roundHalfUp(micros / divisor)
  return { amount, currency, scale }
}

/**
 * Monto que escribe el usuario en un campo numérico (en unidad mayor: "12.34"
 * dólares, "15990" pesos) → Money entero. Trabaja sobre los dígitos del texto,
 * no multiplica floats: "0.1" + scale 2 da exactamente 10. Si trae más
 * decimales que la moneda, redondea half-up. Null si no es un número válido no
 * negativo.
 * @param {number|string|null} value
 * @param {string} currency
 * @returns {Money|null}
 */
export function parseMoneyInput(value, currency) {
  const scale = CURRENCY_SCALE[currency]
  if (scale === undefined) throw new Error(`Moneda desconocida: ${currency}`)
  if (value === null || value === undefined || value === '') return null
  const text = String(value).trim().replace(',', '.')
  const match = /^(\d+)(?:\.(\d*))?$/.exec(text)
  if (!match) return null
  const [, whole, fraction = ''] = match
  const kept = (fraction + '0'.repeat(scale)).slice(0, scale)
  const roundUp = fraction.length > scale && Number(fraction[scale]) >= 5 ? 1 : 0
  const amount = Number(whole + kept) + roundUp
  if (!Number.isSafeInteger(amount)) return null
  return { amount, currency, scale }
}

/**
 * Money → número en unidad mayor, solo para precargar un campo de formulario
 * (nunca para calcular).
 * @param {Money|null} m
 * @returns {number|null}
 */
export function toInputNumber(m) {
  if (!m) return null
  return m.amount / 10 ** m.scale
}

/**
 * Precio unitario × cantidad entera.
 * @param {Money} unit
 * @param {number} qty
 * @returns {Money}
 */
export function multiplyMoney(unit, qty) {
  if (!Number.isInteger(qty)) throw new Error(`multiplyMoney(): cantidad no entera ${qty}`)
  return { amount: unit.amount * qty, currency: unit.currency, scale: unit.scale }
}

/**
 * Suma de montos de una misma moneda. Lanza si se mezclan monedas: sumar CLP
 * con USD es un error de programador, no de datos.
 * @param {Money[]} list
 * @param {string} currency
 * @returns {Money}
 */
export function sumMoney(list, currency) {
  let amount = 0
  for (const m of list) {
    if (m.currency !== currency) {
      throw new Error(`sumMoney(): moneda ${m.currency} en una suma en ${currency}`)
    }
    amount += m.amount
  }
  return money(amount, currency)
}

/**
 * @param {number} value
 * @returns {number}
 */
export function roundHalfUp(value) {
  return Math.sign(value) * Math.floor(Math.abs(value) + 0.5)
}

/**
 * @param {number} n
 */
export function assertSafeMicros(n) {
  if (!Number.isFinite(n) || Math.abs(n) > Number.MAX_SAFE_INTEGER / 1e6) {
    throw new Error(`Valor fuera de rango seguro para aritmética en micros: ${n}`)
  }
}

/**
 * Reparte `totalMicros` entre pesos no negativos, garantizando que
 * Σ resultado === totalMicros exacto (método del resto mayor).
 * Desempate determinista por índice — mismo input, mismo output siempre.
 * @param {number} totalMicros
 * @param {number[]} weights
 * @returns {number[]}
 */
export function allocateByWeights(totalMicros, weights) {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (weights.length === 0) return []
  if (sum === 0) return equalSplit(totalMicros, weights.length)

  const exact = weights.map((w) => (totalMicros * w) / sum)
  const floors = exact.map(Math.floor)
  const flooredSum = floors.reduce((a, b) => a + b, 0)
  let rest = totalMicros - flooredSum

  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)

  const result = [...floors]
  for (let k = 0; k < rest; k++) {
    result[order[k % order.length].i] += 1
  }
  return result
}

/**
 * @param {number} total
 * @param {number} n
 * @returns {number[]}
 */
export function equalSplit(total, n) {
  if (n === 0) return []
  const base = Math.floor(total / n)
  const rest = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0))
}
