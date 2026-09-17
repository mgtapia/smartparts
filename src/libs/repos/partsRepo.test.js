import { describe, it, expect } from 'vitest'
import { listParts, getPart, listAnomalies, listSavingsOpportunities } from './partsRepo'

describe('partsRepo — forma de datos', () => {
  it('listParts() da la forma real del modelo, no el mock crudo', () => {
    const parts = listParts()
    expect(parts.length).toBeGreaterThan(0)
    const p = parts[0]
    expect(p.baselinePrice).toEqual(expect.objectContaining({ currency: 'CLP', scale: 0 }))
    expect(Array.isArray(p.oemCodes)).toBe(true)
    expect(p.quoteRollup).toEqual(
      expect.objectContaining({ original: expect.any(Object), alternative: expect.any(Object) }),
    )
  })

  it('getPart() trae el vehículo y la categoría resueltos, no solo el id', () => {
    const p = getPart('part_b004285') // Puerta DEL DER — tiene cotizaciones mock
    expect(p.vehicle?.id).toBe('dongfeng_e70')
    expect(p.category?.labelEs).toBeTruthy()
  })
})

describe('partsRepo — quote_rollup', () => {
  it('toma el mínimo por tipo (original vs. alternative), no cualquier cotización', () => {
    const p = getPart('part_b004285') // tiene alt=310 y original=580 en el mock
    expect(p.quoteRollup.alternative.minUsd).toBe(310)
    expect(p.quoteRollup.original.minUsd).toBe(580)
  })

  it('parte sin cotizaciones tiene rollup nulo, no revienta', () => {
    const p = getPart('part_sc_platina_del_izq')
    expect(p.quoteRollup.original.minUsd).toBeNull()
    expect(p.quoteRollup.alternative.minUsd).toBeNull()
  })
})

describe('partsRepo — auditoría de anomalías (reporta, no corrige)', () => {
  const anomalies = listAnomalies()

  it('detecta los 3 códigos faltantes reales de la planilla', () => {
    const missing = anomalies.filter((a) => a.type === 'missing_code')
    expect(missing).toHaveLength(3)
  })

  it('detecta el conflicto de precio real (B013771 a dos precios)', () => {
    const conflict = anomalies.find(
      (a) => a.type === 'price_conflict' && a.partIds.includes('part_b013771_der'),
    )
    expect(conflict).toBeTruthy()
    expect(conflict.partIds).toEqual(
      expect.arrayContaining(['part_b013771_der', 'part_b013771_izq']),
    )
  })

  it('detecta el código repetido en 3 bisagras distintas (5705001)', () => {
    const dup = anomalies.find(
      (a) => a.type === 'duplicate_position' && a.detail.includes('5705001'),
    )
    expect(dup).toBeTruthy()
    expect(dup.partIds).toHaveLength(3)
  })
})

describe('partsRepo — ranking de oportunidades de ahorro', () => {
  it('ordena de mayor a menor ahorro total y excluye partes sin ahorro positivo', () => {
    const opportunities = listSavingsOpportunities()
    expect(opportunities.length).toBeGreaterThan(0)
    for (let i = 1; i < opportunities.length; i++) {
      expect(opportunities[i - 1].savingsTotalClp).toBeGreaterThanOrEqual(
        opportunities[i].savingsTotalClp,
      )
    }
    opportunities.forEach((row) => expect(row.savingsPerUnitClp).toBeGreaterThan(0))
  })
})
