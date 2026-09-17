// Cálculo de IVA. Base imponible = CIF + arancel (no solo CIF) — así lo
// liquida Aduana. Ver docs/MOTOR-DE-COSTOS.md §Redondeo.

/**
 * @param {number} cifMicro
 * @param {number} dutyMicro
 * @param {number} vatRateBp
 * @returns {number} vatMicro
 */
export function computeVat(cifMicro, dutyMicro, vatRateBp) {
  const base = cifMicro + dutyMicro
  return Math.round((base * vatRateBp) / 10000)
}
