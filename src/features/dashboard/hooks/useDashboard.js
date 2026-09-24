import { useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { listParts, listSavingsOpportunities, listAnomalies } from '@libs/repos/partsRepo'
import { listQuotes, isQuoteExpiringSoon } from '@libs/repos/quotesRepo'
import { money } from '@libs/money'

const EMPTY = {
  partsCount: 0,
  quoteCoveragePct: 0,
  partsWithQuoteCount: 0,
  savingsOpportunities: [],
  totalSavings: money(0, 'CLP'),
  anomalies: [],
  expiringQuotes: [],
}

function fetchDashboard() {
  return Promise.all([listParts(), listSavingsOpportunities(), listAnomalies(), listQuotes()])
}

function summarize([parts, savingsOpportunities, anomalies, quotes]) {
  const expiringQuotes = quotes.filter((q) => isQuoteExpiringSoon(q))
  const totalSavingsClp = savingsOpportunities.reduce((sum, row) => sum + row.savingsTotalClp, 0)
  const partsWithQuote = parts.filter(
    (p) => p.quoteRollup.original.minUsd !== null || p.quoteRollup.alternative.minUsd !== null,
  )
  return {
    partsCount: parts.length,
    quoteCoveragePct:
      parts.length > 0 ? Math.round((partsWithQuote.length / parts.length) * 100) : 0,
    partsWithQuoteCount: partsWithQuote.length,
    savingsOpportunities: savingsOpportunities.slice(0, 5),
    totalSavings: money(totalSavingsClp, 'CLP'),
    anomalies,
    expiringQuotes,
  }
}

/**
 * El dashboard lidera con REPUESTOS (ahorro, cobertura de cotizaciones,
 * anomalías), no con la flota del cliente — la flota es dato de referencia
 * del módulo Vehículos, no el KPI principal (ver .agent/MEMORY.md).
 */
export function useDashboard() {
  const { data, loading, error } = useCachedQuery('dashboard', fetchDashboard)
  const summary = useMemo(() => (data ? summarize(data) : EMPTY), [data])

  return { ...summary, loading, error }
}
