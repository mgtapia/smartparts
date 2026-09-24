// Modelo del dashboard de sourcing: función pura, sin React ni Firebase. Recibe
// los datos ya leídos y devuelve el resumen, los pendientes por confirmar, la
// comparación de proveedores y los pasos del hito hacia la primera OC. Nada de
// acá estima un ahorro del cliente ni inventa cantidades: cuenta hechos.
import { CONFIRMED_LOGISTICS_STATUSES } from '@constants/enums'
import { factOf } from '@features/suppliers/constants'
import { EXPIRING_DAYS, MANUAL_STEPS, MIN_SUPPLIERS_TO_COMPARE } from './constants'

const DAY_MS = 24 * 60 * 60 * 1000
const isAirMode = (mode) => mode === 'air' || mode === 'courier'
const hasStepValue = (step) => Boolean(step?.value && step?.source)

/**
 * @param {Object} input
 * @param {string} input.vehicleId
 * @param {any[]} input.parts          Todos los repuestos.
 * @param {any[]} input.quotations     Cotizaciones agrupadas (con `lines: [{ part, quote }]`).
 * @param {any[]} input.suppliers      Proveedores.
 * @param {{ mode: string, rates: any, settingsFor: (id: string) => any }} input.assumptions
 * @param {(line: any) => { landedNetUsdMicro: number|null, blockers: string[] }} input.costOf
 * @param {Record<string, { value: string, source: string, at?: any }>} [input.milestone]
 * @param {Date} [input.today]
 */
export function buildDashboard({
  vehicleId,
  parts,
  quotations,
  suppliers,
  assumptions,
  costOf,
  milestone = {},
  today = new Date(),
}) {
  const scopeParts = parts.filter((p) => p.vehicleId === vehicleId)
  const quoteRows = quotations
    .map((q) => ({ ...q, lines: q.lines.filter((l) => l.part.vehicleId === vehicleId) }))
    .filter((q) => q.lines.length > 0)

  const quotedIds = new Set(quoteRows.flatMap((q) => q.lines.map((l) => l.part.id)))
  const quotedParts = scopeParts.filter((p) => quotedIds.has(p.id))
  const supplierById = new Map(suppliers.map((s) => [s.id, s]))
  const activeSupplierIds = [...new Set(quoteRows.map((q) => q.supplierId))]
  const activeSuppliers = activeSupplierIds.map((id) => supplierById.get(id)).filter(Boolean)

  // ---- Conteos base de lo que falta confirmar ----
  const unconfirmedTerms = quoteRows.filter(
    (q) => !q.incotermConfirmed || !q.incotermPlaceConfirmed,
  )
  const unconfirmedCurrency = quoteRows.filter((q) => !q.currencyConfirmed)
  const unconfirmedFormF = activeSuppliers.filter((s) => !factOf(s, 'formF').confirmed)
  const unconfirmedLogistics = quotedParts.filter(
    (p) => !CONFIRMED_LOGISTICS_STATUSES.includes(p.logisticsStatus),
  )
  const unconfirmedCodes = quotedParts.filter((p) => p.codeStatus !== 'confirmed')
  const withoutHs = quotedParts.filter((p) => !(p.hsCode && p.hsCodeSource))

  // Datos de costo que hoy faltan: gasto de origen por proveedor con precio EXW y tarifa de flete.
  const missingOrigin = activeSupplierIds.filter((supplierId) => {
    const settings = assumptions.settingsFor(supplierId)
    if (settings.originCostBp != null) return false
    return quoteRows.some(
      (q) =>
        q.supplierId === supplierId &&
        q.lines.some((l) => (l.quote.incoterm ?? settings.assumedIncoterm) === 'EXW'),
    )
  })
  const freightRate = isAirMode(assumptions.mode)
    ? assumptions.rates.airUsdPerKgCents
    : assumptions.rates.seaUsdPerRtCents
  const freightMissing = freightRate == null ? 1 : 0

  const expiring = quoteRows.filter(
    (q) =>
      q.validUntil && new Date(q.validUntil).getTime() - today.getTime() <= EXPIRING_DAYS * DAY_MS,
  )

  // ---- Pendientes (solo los que tienen algo por resolver) ----
  const pending = [
    {
      id: 'currency',
      label: 'Cotizaciones con moneda sin confirmar',
      count: unconfirmedCurrency.length,
      href: '/quotes',
    },
    {
      id: 'terms',
      label: 'Cotizaciones con Incoterm o lugar sin confirmar',
      count: unconfirmedTerms.length,
      href: '/quotes',
    },
    {
      id: 'formF',
      label: 'Proveedores con Formulario F sin confirmar',
      count: unconfirmedFormF.length,
      href: '/suppliers',
    },
    {
      id: 'origin',
      label: 'Proveedores sin gasto de origen definido',
      count: missingOrigin.length,
      href: '/quotes',
    },
    { id: 'freight', label: 'Tarifa de flete sin definir', count: freightMissing, href: '/quotes' },
    {
      id: 'logistics',
      label: 'Repuestos cotizados con peso y volumen sin confirmar',
      count: unconfirmedLogistics.length,
      href: '/catalog',
    },
    {
      id: 'codes',
      label: 'Repuestos cotizados con código sin confirmar',
      count: unconfirmedCodes.length,
      href: '/catalog',
    },
    {
      id: 'hs',
      label: 'Repuestos cotizados sin partida arancelaria',
      count: withoutHs.length,
      href: '/catalog',
    },
    {
      id: 'expiring',
      label: 'Cotizaciones vencidas o por vencer',
      count: expiring.length,
      href: '/quotes',
    },
  ].filter((p) => p.count > 0)

  // ---- Costo final por línea y ganador por repuesto y calidad ----
  const costed = quoteRows.flatMap((q) =>
    q.lines.map((line) => ({ line, supplierId: q.supplierId, cost: costOf(line) })),
  )
  const groups = new Map()
  for (const c of costed) {
    if (c.cost.landedNetUsdMicro === null) continue
    const key = `${c.line.part.id}|${c.line.quote.partType}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(c)
  }
  const wins = new Map()
  let comparedGroups = 0
  for (const offers of groups.values()) {
    if (new Set(offers.map((o) => o.supplierId)).size < 2) continue
    comparedGroups++
    const best = offers.reduce((a, b) =>
      b.cost.landedNetUsdMicro < a.cost.landedNetUsdMicro ? b : a,
    )
    wins.set(best.supplierId, (wins.get(best.supplierId) ?? 0) + 1)
  }

  // ---- Proveedores ----
  const supplierRows = activeSuppliers.map((supplier) => {
    const own = quoteRows.filter((q) => q.supplierId === supplier.id)
    const ownCosted = costed.filter((c) => c.supplierId === supplier.id)
    const computable = ownCosted.filter((c) => c.cost.landedNetUsdMicro !== null).length
    const partIds = new Set(own.flatMap((q) => q.lines.map((l) => l.part.id)))
    return {
      supplier,
      quotations: own,
      quotedParts: partIds.size,
      totalParts: scopeParts.length,
      originalCount: own.reduce((n, q) => n + q.originalCount, 0),
      alternativeCount: own.reduce((n, q) => n + q.alternativeCount, 0),
      incoterms: [...new Set(own.flatMap((q) => q.incoterms))],
      incotermConfirmed: own.every((q) => q.incotermConfirmed && q.incotermPlaceConfirmed),
      currencies: [...new Set(own.flatMap((q) => q.currencies))],
      currencyConfirmed: own.every((q) => q.currencyConfirmed),
      formF: factOf(supplier, 'formF'),
      cheapestIn: wins.get(supplier.id) ?? 0,
      computableLines: computable,
      totalLines: ownCosted.length,
      costBlocker: computable === 0 ? (ownCosted[0]?.cost.blockers[0] ?? null) : null,
    }
  })

  // ---- Hito ----
  const ratio = (done, total) => ({
    done: total > 0 && done === total,
    progress: `${done} de ${total}`,
  })
  const confirmedTerms = quoteRows.length - unconfirmedTerms.length
  const confirmedCurrency = quoteRows.length - unconfirmedCurrency.length
  const costInputsTotal = activeSupplierIds.length + 1
  const costInputsDone = costInputsTotal - missingOrigin.length - freightMissing

  const steps = [
    {
      id: 'compare',
      label: 'Proveedores para comparar',
      done: activeSupplierIds.length >= MIN_SUPPLIERS_TO_COMPARE,
      progress: `${activeSupplierIds.length} de ${MIN_SUPPLIERS_TO_COMPARE} mínimo`,
      href: '/suppliers',
    },
    {
      id: 'currency',
      label: 'Moneda confirmada',
      ...ratio(confirmedCurrency, quoteRows.length),
      href: '/quotes',
    },
    {
      id: 'terms',
      label: 'Incoterm y lugar confirmados',
      ...ratio(confirmedTerms, quoteRows.length),
      href: '/quotes',
    },
    {
      id: 'formF',
      label: 'Formulario F confirmado',
      ...ratio(activeSuppliers.length - unconfirmedFormF.length, activeSuppliers.length),
      href: '/suppliers',
    },
    {
      id: 'costInputs',
      label: 'Gastos de origen y tarifa de flete definidos',
      ...ratio(costInputsDone, costInputsTotal),
      href: '/quotes',
    },
    {
      id: 'logistics',
      label: 'Peso y volumen confirmados',
      ...ratio(quotedParts.length - unconfirmedLogistics.length, quotedParts.length),
      href: '/catalog',
    },
    {
      id: 'codes',
      label: 'Códigos confirmados',
      ...ratio(quotedParts.length - unconfirmedCodes.length, quotedParts.length),
      href: '/catalog',
    },
    {
      id: 'hs',
      label: 'Partida arancelaria definida',
      ...ratio(quotedParts.length - withoutHs.length, quotedParts.length),
      href: '/catalog',
    },
    ...Object.values(MANUAL_STEPS).map((step) => {
      const value = milestone[step.key]
      return {
        id: step.key,
        label: step.label,
        manual: step,
        done: hasStepValue(value),
        progress: hasStepValue(value) ? String(value.value) : 'Sin registrar',
        value: value ?? null,
      }
    }),
  ]

  return {
    summary: {
      suppliersCount: activeSupplierIds.length,
      quotedPartsCount: quotedParts.length,
      totalParts: scopeParts.length,
      quotationsCount: quoteRows.length,
      pendingCount: pending.reduce((sum, p) => sum + p.count, 0),
      stepsDone: steps.filter((s) => s.done).length,
      stepsTotal: steps.length,
    },
    pending,
    suppliers: supplierRows,
    comparedGroups,
    steps,
  }
}
