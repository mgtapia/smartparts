import { describe, it, expect } from 'vitest'
import { buildDashboard } from './dashboardModel'

const VEHICLE = 'dongfeng_e70'

const part = (id, extra = {}) => ({
  id,
  vehicleId: VEHICLE,
  logisticsStatus: 'estimated',
  codeStatus: 'provisional',
  hsCode: null,
  hsCodeSource: null,
  ...extra,
})

const line = (p, partType = 'alternative', extra = {}) => ({
  part: p,
  quote: { id: `${p.id}-${partType}`, partType, incoterm: 'EXW', ...extra },
})

const quotation = (supplierId, lines, extra = {}) => ({
  supplierId,
  lines,
  originalCount: lines.filter((l) => l.quote.partType === 'original').length,
  alternativeCount: lines.filter((l) => l.quote.partType === 'alternative').length,
  incoterms: ['EXW'],
  incotermConfirmed: false,
  incotermPlaceConfirmed: false,
  currencies: ['USD'],
  currencyConfirmed: false,
  validUntil: null,
  ...extra,
})

const assumptionsWith = (over = {}) => ({
  mode: 'sea_lcl',
  rates: { seaUsdPerRtCents: 100, airUsdPerKgCents: 100 },
  settingsFor: () => ({ originCostBp: 500, assumedIncoterm: 'none' }),
  ...over,
})

const suppliers = [
  { id: 'a', alias: 'A' },
  { id: 'b', alias: 'B' },
]

function build(over = {}) {
  const p1 = part('p1')
  const p2 = part('p2')
  const p3 = part('p3')
  return buildDashboard({
    vehicleId: VEHICLE,
    parts: [p1, p2, p3, part('otro', { vehicleId: 'kia_niro_ev' })],
    quotations: [quotation('a', [line(p1), line(p2)]), quotation('b', [line(p1)])],
    suppliers,
    assumptions: assumptionsWith(),
    ...over,
  })
}

describe('buildDashboard', () => {
  it('cuenta cobertura solo sobre el vehículo del alcance', () => {
    const { summary } = build()
    expect(summary.totalParts).toBe(3)
    expect(summary.quotedPartsCount).toBe(2)
    expect(summary.suppliersCount).toBe(2)
    expect(summary.quotationsCount).toBe(2)
  })

  it('un pendiente desaparece cuando el dato se confirma', () => {
    const pendingIds = (d) => d.pending.map((p) => p.id)
    expect(pendingIds(build())).toContain('terms')
    expect(pendingIds(build())).toContain('currency')

    const confirmed = build({
      quotations: [
        quotation('a', [line(part('p1'))], {
          incotermConfirmed: true,
          incotermPlaceConfirmed: true,
          currencyConfirmed: true,
        }),
      ],
    })
    expect(confirmed.pending.map((p) => p.id)).not.toContain('terms')
    expect(confirmed.pending.map((p) => p.id)).not.toContain('currency')
  })

  it('cuenta las cotizaciones inferidas como pendiente', () => {
    const p1 = part('p1')
    const d = build({
      quotations: [
        quotation('a', [
          line(p1, 'alternative', { inferred: true }),
          line(part('p2'), 'alternative', { inferred: true }),
          line(part('p3')),
        ]),
      ],
    })
    expect(d.pending.find((p) => p.id === 'inferred')?.count).toBe(2)
    expect(build().pending.map((p) => p.id)).not.toContain('inferred')
  })

  it('no lista pendientes con cantidad cero', () => {
    expect(build().pending.every((p) => p.count > 0)).toBe(true)
  })

  it('marca el gasto de origen y la tarifa cuando faltan', () => {
    const d = build({
      assumptions: assumptionsWith({
        rates: { seaUsdPerRtCents: null, airUsdPerKgCents: null },
        settingsFor: () => ({ originCostBp: null, assumedIncoterm: 'none' }),
      }),
    })
    const byId = Object.fromEntries(d.pending.map((p) => [p.id, p.count]))
    expect(byId.origin).toBe(2)
    expect(byId.freight).toBe(1)
  })

  it('un paso manual solo cuenta si tiene valor y fuente', () => {
    const step = (d) => d.steps.find((s) => s.id === 'po_issued')
    expect(step(build()).done).toBe(false)
    expect(step(build({ milestone: { po_issued: { value: 'OC-1' } } })).done).toBe(false)
    expect(
      step(build({ milestone: { po_issued: { value: 'OC-1', source: 'correo del cliente' } } }))
        .done,
    ).toBe(true)
  })

  it('el avance del hito suma los pasos cumplidos', () => {
    const d = build()
    expect(d.summary.stepsTotal).toBe(d.steps.length)
    expect(d.summary.stepsDone).toBe(d.steps.filter((s) => s.done).length)
  })
})
