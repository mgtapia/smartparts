import { describe, it, expect } from 'vitest'
import { checkDgBlockers } from './dgBlocker'

const liIonBattery = {
  unNumber: 'UN3480',
  hazardClass: '9',
  un383: { status: 'provided' },
  airTransport: {
    allowed: false,
    reasonCode: 'forbidden_passenger_aircraft',
    reasonNote: 'Prohibido en avión de pasajeros',
  },
  seaTransport: { allowed: true, lclAccepted: false },
}

describe('checkDgBlockers — bloqueo, no advertencia', () => {
  it('sin perfil DG no hay blockers ni warnings', () => {
    expect(checkDgBlockers('air', undefined)).toEqual({ blockers: [], warnings: [] })
  })

  it('batería de litio en modo aéreo: blocker, no solo warning', () => {
    const { blockers } = checkDgBlockers('air', liIonBattery)
    expect(blockers.length).toBeGreaterThan(0)
    expect(blockers[0]).toContain('UN3480')
  })

  it('batería de litio en LCL sin aceptación del consolidador: blocker', () => {
    const { blockers } = checkDgBlockers('sea_lcl', liIonBattery)
    expect(blockers.length).toBeGreaterThan(0)
  })

  it('batería de litio en FCL dedicado: sin blocker (LCL no aplica)', () => {
    const { blockers } = checkDgBlockers('sea_fcl_20', liIonBattery)
    expect(blockers).toEqual([])
  })

  it('UN38.3 pendiente genera warning, no blocker', () => {
    const profile = {
      ...liIonBattery,
      un383: { status: 'pending' },
      airTransport: { allowed: true },
    }
    const { blockers, warnings } = checkDgBlockers('sea_fcl_20', profile)
    expect(blockers).toEqual([])
    expect(warnings.some((w) => w.includes('UN38.3'))).toBe(true)
  })

  it('cargo aircraft only genera warning, no blocker', () => {
    const profile = { ...liIonBattery, airTransport: { allowed: true, cargoAircraftOnly: true } }
    const { blockers, warnings } = checkDgBlockers('air', profile)
    expect(blockers).toEqual([])
    expect(warnings.some((w) => w.includes('cargo'))).toBe(true)
  })
})
