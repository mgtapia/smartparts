import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  money,
  toMicros,
  fromMicros,
  roundHalfUp,
  allocateByWeights,
  equalSplit,
  parseMoneyInput,
  toInputNumber,
  multiplyMoney,
  sumMoney,
} from './money'

describe('parseMoneyInput — texto del usuario a Money entero', () => {
  it('lee dólares con decimales sin pasar por floats', () => {
    expect(parseMoneyInput('0.1', 'USD')).toEqual(money(10, 'USD'))
    expect(parseMoneyInput(12.34, 'USD')).toEqual(money(1234, 'USD'))
    expect(parseMoneyInput('7', 'USD')).toEqual(money(700, 'USD'))
    expect(parseMoneyInput('3,5', 'CNY')).toEqual(money(350, 'CNY'))
  })

  it('CLP no tiene decimales: redondea half-up', () => {
    expect(parseMoneyInput('15990', 'CLP')).toEqual(money(15990, 'CLP'))
    expect(parseMoneyInput('15990.5', 'CLP')).toEqual(money(15991, 'CLP'))
    expect(parseMoneyInput('15990.49', 'CLP')).toEqual(money(15990, 'CLP'))
  })

  it('más decimales que la moneda redondea half-up', () => {
    expect(parseMoneyInput('1.005', 'USD')).toEqual(money(101, 'USD'))
    expect(parseMoneyInput('1.004', 'USD')).toEqual(money(100, 'USD'))
  })

  it('vacío o inválido devuelve null', () => {
    expect(parseMoneyInput('', 'USD')).toBeNull()
    expect(parseMoneyInput(null, 'USD')).toBeNull()
    expect(parseMoneyInput('-3', 'USD')).toBeNull()
    expect(parseMoneyInput('abc', 'USD')).toBeNull()
  })

  it('property: ida y vuelta exacta para cualquier monto entero en centavos', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000_000 }), (cents) => {
        const m = money(cents, 'USD')
        expect(parseMoneyInput(toInputNumber(m), 'USD')).toEqual(m)
      }),
    )
  })
})

describe('multiplyMoney / sumMoney', () => {
  it('multiplica por una cantidad entera', () => {
    expect(multiplyMoney(money(1234, 'USD'), 3)).toEqual(money(3702, 'USD'))
    expect(() => multiplyMoney(money(1, 'USD'), 1.5)).toThrow()
  })

  it('suma montos de una moneda y rechaza mezclar monedas', () => {
    expect(sumMoney([money(100, 'CLP'), money(250, 'CLP')], 'CLP')).toEqual(money(350, 'CLP'))
    expect(sumMoney([], 'USD')).toEqual(money(0, 'USD'))
    expect(() => sumMoney([money(1, 'USD')], 'CLP')).toThrow()
  })
})

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
