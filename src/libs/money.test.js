import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { money, toMicros, fromMicros, roundHalfUp, allocateByWeights, equalSplit } from './money'

describe('money / toMicros / fromMicros', () => {
  it('convierte ida y vuelta sin pérdida para montos exactos', () => {
    const m = money(12345, 'USD') // $123.45
    expect(toMicros(m)).toBe(123_450_000)
    expect(fromMicros(123_450_000, 'USD')).toEqual(m)
  })

  it('CLP no tiene decimales (scale 0)', () => {
    const m = money(1000, 'CLP') // $1.000 CLP
    expect(toMicros(m)).toBe(1_000_000_000)
    expect(fromMicros(1_000_000_000, 'CLP')).toEqual(m)
  })

  it('rechaza montos no enteros', () => {
    expect(() => money(12.5, 'USD')).toThrow()
  })

  it('rechaza moneda desconocida', () => {
    expect(() => money(100, 'XXX')).toThrow()
  })
})

describe('roundHalfUp', () => {
  it('redondea .5 siempre hacia arriba en magnitud', () => {
    expect(roundHalfUp(2.5)).toBe(3)
    expect(roundHalfUp(-2.5)).toBe(-3)
    expect(roundHalfUp(2.4)).toBe(2)
  })
})

describe('allocateByWeights — invariante de suma exacta', () => {
  it('caso conocido: 100 repartido 2/1 dos líneas', () => {
    expect(allocateByWeights(100, [2, 1])).toEqual([67, 33])
  })

  it('pesos todos en cero cae a equalSplit', () => {
    expect(allocateByWeights(10, [0, 0, 0])).toEqual(equalSplit(10, 3))
  })

  it('array vacío devuelve vacío', () => {
    expect(allocateByWeights(100, [])).toEqual([])
  })

  it('property: la suma del resultado es siempre exactamente el total, para cualquier total y pesos no negativos', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000_000 }),
        fc.array(fc.integer({ min: 0, max: 1_000_000 }), { minLength: 1, maxLength: 20 }),
        (total, weights) => {
          const result = allocateByWeights(total, weights)
          const sum = result.reduce((a, b) => a + b, 0)
          expect(sum).toBe(total)
          expect(result).toHaveLength(weights.length)
          result.forEach((v) => expect(v).toBeGreaterThanOrEqual(0))
        },
      ),
    )
  })
})

describe('equalSplit — invariante de suma exacta', () => {
  it('property: la suma es siempre el total, para cualquier total y n', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000_000 }),
        fc.integer({ min: 1, max: 50 }),
        (total, n) => {
          const result = equalSplit(total, n)
          expect(result.reduce((a, b) => a + b, 0)).toBe(total)
          expect(result).toHaveLength(n)
        },
      ),
    )
  })
})
