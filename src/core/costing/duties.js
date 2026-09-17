// Cálculo de arancel ad valorem. El 0% del TLC Chile-China NO es automático:
// depende de la partida (hsCode) y de presentar un Form F válido por línea.
// Ver docs/MOTOR-DE-COSTOS.md §Regla dura: nada de tasas hardcodeadas.

/**
 * @param {number} cifMicro
 * @param {string|undefined} hsCode
 * @param {'form_f'|'none'|'pending'} originCert
 * @param {import('./types').CostParamSet['duty']} duty
 * @returns {{ dutyMicro: number, rateBp: number, ftaApplied: boolean, warning?: string }}
 */
export function computeDuty(cifMicro, hsCode, originCert, duty) {
  const override = hsCode ? duty.rateOverridesByHs?.[hsCode] : undefined
  const generalBp = override?.generalBp ?? duty.generalAdValoremBp
  const hasFtaRate = override?.ftaBp !== undefined

  let rateBp = generalBp
  let ftaApplied = false
  let warning

  if (originCert === 'form_f' && hasFtaRate) {
    rateBp = override.ftaBp
    ftaApplied = true
  } else if (originCert === 'form_f' && !hasFtaRate) {
    warning = hsCode
      ? `Form F presentado pero no hay tasa TLC registrada para la partida ${hsCode} — se aplicó el arancel general.`
      : 'Form F presentado pero la línea no tiene HS code — se aplicó el arancel general.'
  } else if (originCert === 'pending') {
    warning =
      'Certificado de Origen (Form F) pendiente — se aplicó el arancel general hasta confirmar.'
  }

  const dutyMicro = Math.round((cifMicro * rateBp) / 10000)
  return { dutyMicro, rateBp, ftaApplied, warning }
}
