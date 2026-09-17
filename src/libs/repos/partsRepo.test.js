// Prueba computeAnomalies/computeSavingsOpportunities — las funciones PURAS
// de partsRepo.js, no listParts()/getPart() (esas hacen I/O a Firestore, ver
// .agent/STATUS.md §Notas de verificación). Los fixtures acá abajo mapean los
// mocks reales de la planilla del cliente inicial (src/mocks/parts.js,
// src/mocks/quotes.js) a la forma cruda que devuelve Firestore, para seguir
// probando contra las anomalías reales y no contra datos sintéticos.
import { describe, it, expect } from 'vitest'
import { computeAnomalies, computeSavingsOpportunities } from './partsRepo'
import { PARTS } from '@mocks/parts'
import { QUOTES } from '@mocks/quotes'

function toRawPart(p) {
  return {
    id: p.id,
    name_es: p.nameEs,
    oem_codes: p.oemCode ? [{ code: p.oemCode, code_status: p.codeStatus }] : [],
    code_status: p.codeStatus,
    baseline_price: { amount: p.baselinePriceClp, currency: 'CLP', scale: 0 },
  }
}

function toShapedPartForSavings(p) {
  const rollup = { original: { minUsd: null }, alternative: { minUsd: null } }
  QUOTES.filter((q) => q.partId === p.id).forEach((q) => {
    const bucket = rollup[q.partType]
    if (!bucket) return
    if (bucket.minUsd === null || q.unitPriceUsd < bucket.minUsd) bucket.minUsd = q.unitPriceUsd
  })
  return {
    id: p.id,
    baselinePrice: { amount: p.baselinePriceClp },
    quantityEstimated: p.quantityEstimated,
    quoteRollup: rollup,
  }
}

describe('partsRepo — auditoría de anomalías (reporta, no corrige)', () => {
  const anomalies = computeAnomalies(PARTS.map(toRawPart))

  it('detecta las 60 filas "SIN CODIGO" reales de la planilla completa (4 marcas)', () => {
    const missing = anomalies.filter((a) => a.type === 'missing_code')
    expect(missing).toHaveLength(60)
  })

  it('detecta el conflicto de precio real (B013771 a dos precios)', () => {
    const conflict = anomalies.find(
      (a) => a.type === 'price_conflict' && a.partIds.includes('part_b013771'),
    )
    expect(conflict).toBeTruthy()
    expect(conflict.partIds).toEqual(expect.arrayContaining(['part_b013771', 'part_b013771_2']))
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
    const opportunities = computeSavingsOpportunities(PARTS.map(toShapedPartForSavings))
    expect(opportunities.length).toBeGreaterThan(0)
    for (let i = 1; i < opportunities.length; i++) {
      expect(opportunities[i - 1].savingsTotalClp).toBeGreaterThanOrEqual(
        opportunities[i].savingsTotalClp,
      )
    }
    opportunities.forEach((row) => expect(row.savingsPerUnitClp).toBeGreaterThan(0))
  })
})
