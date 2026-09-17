// Peso facturable por línea: real vs volumétrico, según el modo de envío.
// Ver docs/MOTOR-DE-COSTOS.md §Peso volumétrico.

/**
 * @param {number} volumeCm3
 * @param {number} divisor  6000 o 5000 según negociación con el forwarder.
 * @returns {number} kg (puede ser fraccionario; se trabaja en micros más arriba).
 */
export function airVolumetricKg(volumeCm3, divisor) {
  return volumeCm3 / divisor
}

/**
 * @param {number} volumeCm3
 * @param {number} kgPerCbm  Normalmente 1000 (1 CBM ≈ 1000 kg, W/M marítimo LCL).
 * @returns {number} "toneladas de flete" (Revenue Tons) equivalentes al volumen.
 */
export function seaRevenueTonsFromVolume(volumeCm3, kgPerCbm) {
  const cbm = volumeCm3 / 1_000_000
  return (cbm * kgPerCbm) / 1000
}

/**
 * Determina el peso/unidad facturable de una línea aérea: el mayor entre
 * el peso real y el volumétrico.
 * @param {number} grossWeightG
 * @param {number} volumeCm3
 * @param {number} divisor
 * @returns {{ chargeableKg: number, basis: 'real'|'volumetric' }}
 */
export function airChargeableWeight(grossWeightG, volumeCm3, divisor) {
  const realKg = grossWeightG / 1000
  const volKg = airVolumetricKg(volumeCm3, divisor)
  return volKg > realKg ? { chargeableKg: volKg, basis: 'volumetric' } : { chargeableKg: realKg, basis: 'real' }
}

/**
 * Determina el "revenue ton" facturable de una línea marítima LCL: el mayor
 * entre el peso real (en toneladas) y el volumen (en CBM, 1:1 con R/T).
 * @param {number} grossWeightG
 * @param {number} volumeCm3
 * @param {number} kgPerCbm
 * @returns {{ chargeableRt: number, basis: 'real'|'volumetric' }}
 */
export function seaLclChargeableRt(grossWeightG, volumeCm3, kgPerCbm) {
  const realTons = grossWeightG / 1_000_000
  const volRt = seaRevenueTonsFromVolume(volumeCm3, kgPerCbm)
  return volRt > realTons
    ? { chargeableRt: volRt, basis: 'volumetric' }
    : { chargeableRt: realTons, basis: 'real' }
}
