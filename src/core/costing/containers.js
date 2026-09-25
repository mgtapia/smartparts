// Contenedor completo (FCL): cuánto de un contenedor ocupa una carga y cuántos contenedores
// hacen falta. Un contenedor se llena por volumen o por peso, lo que se agote primero.
// Función pura, sin dinero: las cantidades de contenedores no son montos.

/** Modos de contenedor completo, con la clave de `ShippingMode`. */
export const FCL_MODES = ['sea_fcl_20', 'sea_fcl_40hq']

/**
 * @param {string} mode
 * @returns {boolean}
 */
export function isFclMode(mode) {
  return FCL_MODES.includes(mode)
}

/**
 * @typedef {Object} ContainerSpec
 * @property {number} freightCents  Flete por contenedor, centavos de USD.
 * @property {number} capacityM3    Volumen útil (lo que se alcanza a cargar, no el interior).
 * @property {number} capacityKg    Carga útil máxima.
 */

const capacityCm3 = (spec) => Math.round(spec.capacityM3 * 1_000_000)
const capacityG = (spec) => Math.round(spec.capacityKg * 1000)

/**
 * Parte de un contenedor que ocupa una carga: el mayor entre su volumen y su peso como
 * fracción de la capacidad. Puede pasar de 1 (la carga necesita más de un contenedor).
 * @param {number} weightG
 * @param {number} volumeCm3
 * @param {ContainerSpec} spec
 * @returns {{ share: number, basis: 'volume'|'weight' }}
 */
export function containerShare(weightG, volumeCm3, spec) {
  const byVolume = volumeCm3 / capacityCm3(spec)
  const byWeight = weightG / capacityG(spec)
  return byWeight > byVolume
    ? { share: byWeight, basis: 'weight' }
    : { share: byVolume, basis: 'volume' }
}

/**
 * Contenedores que hacen falta para una carga: los que alcanzan para el volumen y para el peso,
 * redondeando hacia arriba. Sin carga, cero. Aritmética entera (cm³ y g contra la capacidad).
 * @param {number} weightG
 * @param {number} volumeCm3
 * @param {ContainerSpec} spec
 * @returns {number}
 */
export function containersNeeded(weightG, volumeCm3, spec) {
  if (!(weightG > 0) && !(volumeCm3 > 0)) return 0
  const byVolume = Math.ceil(Math.round(volumeCm3) / capacityCm3(spec))
  const byWeight = Math.ceil(Math.round(weightG) / capacityG(spec))
  return Math.max(1, byVolume, byWeight)
}
