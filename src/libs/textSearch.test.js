import { describe, it, expect } from 'vitest'
import { makeMatcher, matchScore, normalizeText } from './textSearch'

const hit = (query, ...fields) => makeMatcher(query)(fields)

describe('makeMatcher', () => {
  it('sin consulta cumple siempre', () => {
    expect(hit('', 'Bandeja')).toBe(true)
    expect(hit('   ', 'Bandeja')).toBe(true)
  })

  it('ignora tildes y mayúsculas', () => {
    expect(hit('CAMARA', 'Cámara trasera')).toBe(true)
  })

  it('exige todas las palabras, aunque estén en campos distintos', () => {
    expect(hit('bandeja b003427', 'Bandeja DEL DER', 'B003427')).toBe(true)
    expect(hit('bandeja zzz', 'Bandeja DEL DER', 'B003427')).toBe(false)
  })

  it('encuentra el código sin importar guiones ni espacios', () => {
    expect(hit('B003427', 'Bandeja', 'B-003 427')).toBe(true)
    expect(hit('b-003-427', 'Bandeja', 'B003427')).toBe(true)
  })

  it('un fragmento corto no coincide por el código compacto', () => {
    expect(hit('b0', 'Bandeja', 'XB0-1')).toBe(true)
    expect(hit('9-', 'Bandeja', 'A1')).toBe(false)
  })

  it('tolera el plural', () => {
    expect(hit('bisagras', 'Bisagra superior')).toBe(true)
    expect(hit('bisagra', 'Bisagras')).toBe(true)
  })

  it('entiende las abreviaturas de posición', () => {
    expect(hit('derecha', 'Óptico DEL DER')).toBe(true)
    expect(hit('trasero izquierdo', 'Amortiguador TRAS IZQ')).toBe(true)
    expect(hit('trasero izquierdo', 'Amortiguador DEL IZQ')).toBe(false)
    expect(hit('original', 'Calidad OEM')).toBe(true)
  })

  it('busca en varios campos: categoría, vehículo, proveedor', () => {
    expect(hit('cables dongfeng', 'Caliper', 'Frenos', 'Dongfeng E70')).toBe(false)
    expect(hit('frenos dongfeng', 'Caliper', 'Frenos', 'Dongfeng E70')).toBe(true)
  })
})

describe('matchScore', () => {
  it('prefiere el código exacto, luego el que empieza igual, luego el que contiene', () => {
    const exact = matchScore('b003427', ['Bandeja', 'B-003427'])
    const starts = matchScore('band', ['Bandeja', 'B003427'])
    const contains = matchScore('ndej', ['Bandeja', 'B003427'])
    expect(exact).toBeGreaterThan(starts)
    expect(starts).toBeGreaterThan(contains)
    expect(contains).toBeGreaterThan(0)
    expect(matchScore('zzz', ['Bandeja'])).toBe(0)
  })
})

describe('normalizeText', () => {
  it('quita tildes', () => {
    expect(normalizeText('Óptico')).toBe('optico')
  })
})
