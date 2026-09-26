import { describe, expect, it } from 'vitest'
import { buildSearchItems, searchItems, RESULTS_PER_GROUP, SEARCH_GROUP } from './searchModel'

const parts = [
  { id: 'p1', nameEs: 'Cámara de retroceso', code: 'ABC-1', nameEn: 'Reversing camera' },
  { id: 'p2', nameEs: 'Filtro de aceite', code: 'XYZ-9' },
]
const suppliers = [{ id: 's1', name: 'Guangzhou Youman Trading', alias: 'Youman' }]
const clients = [{ id: 'c1', name: 'Tucar' }]

const items = buildSearchItems({
  parts,
  suppliers,
  clients,
  clientOrderRows: [{ order: { id: 'o1', number: '12' }, client: clients[0] }],
  purchaseOrderRows: [
    { order: { id: 'o2', number: null, supplierId: 's1' }, supplier: suppliers[0] },
  ],
})

describe('searchItems', () => {
  it('ignora tildes y mayúsculas', () => {
    expect(searchItems(items, 'CAMARA').map((i) => i.key)).toEqual(['Repuestos:p1'])
  })

  it('exige todas las palabras', () => {
    expect(searchItems(items, 'filtro xyz')).toHaveLength(1)
    expect(searchItems(items, 'filtro abc')).toHaveLength(0)
  })

  it('busca por código y por nombre en inglés', () => {
    expect(searchItems(items, 'abc-1')).toHaveLength(1)
    expect(searchItems(items, 'reversing')).toHaveLength(1)
  })

  it('lleva cada resultado a su ficha', () => {
    const hrefs = searchItems(items, 'tucar youman 12').map((i) => i.href)
    expect(hrefs).toEqual([])
    expect(searchItems(items, 'tucar').map((i) => i.href)).toEqual([
      '/clients/c1',
      '/client-orders/o1',
    ])
    expect(searchItems(items, 'youman').map((i) => i.href)).toEqual([
      '/suppliers/s1',
      '/purchase-orders/o2',
    ])
  })

  it('consulta vacía no devuelve nada', () => {
    expect(searchItems(items, '  ')).toEqual([])
  })

  it('limita los resultados por grupo', () => {
    const many = buildSearchItems({
      parts: Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, nameEs: `Filtro ${i}` })),
    })
    const found = searchItems(many, 'filtro')
    expect(found).toHaveLength(RESULTS_PER_GROUP)
    expect(found.every((i) => i.group === SEARCH_GROUP.PART)).toBe(true)
  })
})
