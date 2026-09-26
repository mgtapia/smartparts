import { describe, it, expect } from 'vitest'
import { nextSort, sortRows } from './sortRows'

const by = (key) => (r) => r[key]

describe('sortRows', () => {
  it('ordena números como números', () => {
    const rows = [{ n: 10 }, { n: 2 }, { n: 33 }]
    expect(sortRows(rows, by('n')).map((r) => r.n)).toEqual([2, 10, 33])
    expect(sortRows(rows, by('n'), 'desc').map((r) => r.n)).toEqual([33, 10, 2])
  })

  it('ordena texto sin importar tildes ni mayúsculas, y los números dentro del texto en orden natural', () => {
    const rows = [{ t: 'Óptico' }, { t: 'bisagra 10' }, { t: 'Bisagra 2' }, { t: 'amortiguador' }]
    expect(sortRows(rows, by('t')).map((r) => r.t)).toEqual([
      'amortiguador',
      'Bisagra 2',
      'bisagra 10',
      'Óptico',
    ])
  })

  it('deja los vacíos al final, también al invertir', () => {
    const rows = [{ n: null }, { n: 5 }, { n: undefined }, { n: 1 }, { n: '' }]
    expect(sortRows(rows, by('n')).map((r) => r.n)).toEqual([1, 5, null, undefined, ''])
    expect(sortRows(rows, by('n'), 'desc').map((r) => r.n)).toEqual([5, 1, null, undefined, ''])
  })

  it('conserva el orden entre iguales y no modifica la lista original', () => {
    const rows = [
      { k: 1, id: 'a' },
      { k: 1, id: 'b' },
      { k: 0, id: 'c' },
    ]
    expect(sortRows(rows, by('k')).map((r) => r.id)).toEqual(['c', 'a', 'b'])
    expect(sortRows(rows, by('k'), 'desc').map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('nextSort', () => {
  it('pasa de ascendente a descendente y a sin orden', () => {
    const first = nextSort(null, 'price')
    expect(first).toEqual({ id: 'price', dir: 'asc' })
    const second = nextSort(first, 'price')
    expect(second).toEqual({ id: 'price', dir: 'desc' })
    expect(nextSort(second, 'price')).toBeNull()
  })

  it('otra columna empieza en ascendente', () => {
    expect(nextSort({ id: 'price', dir: 'desc' }, 'name')).toEqual({ id: 'name', dir: 'asc' })
  })
})
