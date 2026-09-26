import { describe, it, expect } from 'vitest'
import { TIERS, isOffered, salePrice } from './pricingModel'

const pricing = { minMarginBp: 3000, maxSavingOemBp: 5000, maxSavingAltBp: 7000, minSavingBp: 1000 }
const price = (costClp, baselineClp, quality = 'original') =>
  salePrice({ costClp, baselineClp, quality, pricing })

describe('salePrice', () => {
  it('tramo A: el cliente ahorra el máximo y el margen queda por encima del mínimo', () => {
    // Chapa de maleta de la lista de Diego: costo 24.861, hoy 534.809.
    const r = price(24_861, 534_809)
    expect(r.tier).toBe(TIERS.MAX_SAVING)
    expect(r.priceClp).toBe(267_400)
    expect(r.savingBp).toBe(5000)
  })

  it('tramo B: rige el margen mínimo sobre la venta y el cliente aún ahorra', () => {
    // Costo 70.000 → piso 100.000; objetivo 50 % de 160.000 = 80.000.
    const r = price(70_000, 160_000)
    expect(r.tier).toBe(TIERS.MIN_MARGIN)
    expect(r.priceClp).toBe(100_000)
    expect(r.marginBp).toBe(3000)
  })

  it('tramo C: ni con el margen mínimo el cliente ahorra lo mínimo', () => {
    const r = price(70_000, 105_000)
    expect(r.tier).toBe(TIERS.NOT_COMPETITIVE)
    expect(isOffered(r.tier)).toBe(false)
  })

  it('el alternativo permite un ahorro mayor que el original', () => {
    expect(price(10_000, 100_000, 'alternative').priceClp).toBe(30_000)
    expect(price(10_000, 100_000, 'original').priceClp).toBe(50_000)
  })

  it('redondea a la centena', () => {
    expect(price(24_000, 300_000).priceClp % 100).toBe(0)
  })

  it('sin precio de referencia rige solo el piso y no hay tramo', () => {
    const r = price(70_000, null)
    expect(r.tier).toBeNull()
    expect(r.priceClp).toBe(100_000)
    expect(r.savingBp).toBeNull()
  })
})
