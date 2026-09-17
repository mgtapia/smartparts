import { useMemo } from 'react'
import { listParts, listSavingsOpportunities, listAnomalies } from '@libs/repos/partsRepo'
import { listQuotes, isQuoteExpiringSoon } from '@libs/repos/quotesRepo'
import { money } from '@libs/money'

/**
 * Fase 1: lee de repos sobre mocks (síncrono). En Fase 2 estos repos pasan a
 * leer Firestore — este hook no cambia, ver .agent/ARCHITECTURE.md §4.
 *
 * El dashboard lidera con REPUESTOS (ahorro, cobertura de cotizaciones,
 * anomalías), no con la flota del cliente — la flota es dato de referencia
 * del módulo Vehículos, no el KPI principal (ver .agent/MEMORY.md).
 */
export function useDashboard() {
  const parts = useMemo(() => listParts(), [])
  const savingsOpportunities = useMemo(() => listSavingsOpportunities(), [])
  const anomalies = useMemo(() => listAnomalies(), [])

  const expiringQuotes = useMemo(() => listQuotes().filter((q) => isQuoteExpiringSoon(q)), [])

  const totalSavingsClp = useMemo(
    () => savingsOpportunities.reduce((sum, row) => sum + row.savingsTotalClp, 0),
    [savingsOpportunities],
  )

  const partsWithQuote = useMemo(
    () =>
      parts.filter(
        (p) => p.quoteRollup.original.minUsd !== null || p.quoteRollup.alternative.minUsd !== null,
      ),
    [parts],
  )
  const quoteCoveragePct =
    parts.length > 0 ? Math.round((partsWithQuote.length / parts.length) * 100) : 0

  return {
    partsCount: parts.length,
    quoteCoveragePct,
    partsWithQuoteCount: partsWithQuote.length,
    savingsOpportunities: savingsOpportunities.slice(0, 5),
    totalSavings: money(totalSavingsClp, 'CLP'),
    anomalies,
    expiringQuotes,
  }
}
