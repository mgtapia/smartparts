import { describe, expect, it } from 'vitest'
import { estimateOriginCostBp } from './originCost'

describe('estimateOriginCostBp', () => {
  it('suma la parte fija y la variable por distancia', () => {
    expect(estimateOriginCostBp(0)).toBe(200)
    expect(estimateOriginCostBp(500)).toBe(350)
  })
  it('sin distancia válida no estima', () => {
    expect(estimateOriginCostBp(null)).toBeNull()
    expect(estimateOriginCostBp(Number.NaN)).toBeNull()
    expect(estimateOriginCostBp(-5)).toBeNull()
  })
})
