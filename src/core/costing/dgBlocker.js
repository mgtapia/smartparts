// Mercancía peligrosa (baterías de litio, Clase 9): bloqueo, no advertencia.
// Producir un costo aéreo para algo que no puede volar es peor que no
// producirlo. Ver docs/MOTOR-DE-COSTOS.md §Baterías y alto voltaje.

/**
 * @param {import('./types').ShippingMode} mode
 * @param {import('./types').DgProfile|undefined} dgProfile
 * @returns {{ blockers: string[], warnings: string[] }}
 */
export function checkDgBlockers(mode, dgProfile) {
  if (!dgProfile) return { blockers: [], warnings: [] }

  const blockers = []
  const warnings = []

  if (dgProfile.un383.status !== 'provided') {
    warnings.push(
      `${dgProfile.unNumber}: falta UN38.3 (estado: ${dgProfile.un383.status}) — requerido antes de despachar.`,
    )
  }

  if (mode === 'air') {
    if (!dgProfile.airTransport.allowed) {
      blockers.push(
        `${dgProfile.unNumber}: prohibido en avión de pasajeros${
          dgProfile.airTransport.reasonNote ? ` — ${dgProfile.airTransport.reasonNote}` : ''
        }.`,
      )
    } else if (dgProfile.airTransport.cargoAircraftOnly) {
      warnings.push(`${dgProfile.unNumber}: solo admite avión de carga (cargo aircraft only).`)
    }
  }

  if (mode.startsWith('sea')) {
    if (!dgProfile.seaTransport.allowed) {
      blockers.push(`${dgProfile.unNumber}: no permitido por vía marítima.`)
    } else if (mode === 'sea_lcl' && dgProfile.seaTransport.lclAccepted === false) {
      blockers.push(
        `${dgProfile.unNumber}: el consolidador LCL no acepta esta mercancía peligrosa — requiere contenedor completo (FCL) dedicado.`,
      )
    }
  }

  return { blockers, warnings }
}
