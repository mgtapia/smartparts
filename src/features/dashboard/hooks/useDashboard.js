import { useEffect, useState } from 'react'
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

/**
 * El dashboard lidera con REPUESTOS (ahorro, cobertura de cotizaciones,
 * anomalías), no con la flota del cliente — la flota es dato de referencia
 * del módulo Vehículos, no el KPI principal (ver .agent/MEMORY.md).
 */
export function useDashboard() {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([listParts(), listSavingsOpportunities(), listAnomalies(), listQuotes()])
      .then(([parts, savingsOpportunities, anomalies, quotes]) => {
        if (cancelled) return
        const expiringQuotes = quotes.filter((q) => isQuoteExpiringSoon(q))
        const totalSavingsClp = savingsOpportunities.reduce(
          (sum, row) => sum + row.savingsTotalClp,
          0,
        )
        const partsWithQuote = parts.filter(
          (p) =>
            p.quoteRollup.original.minUsd !== null || p.quoteRollup.alternative.minUsd !== null,
        )
        setData({
          partsCount: parts.length,
          quoteCoveragePct:
            parts.length > 0 ? Math.round((partsWithQuote.length / parts.length) * 100) : 0,
          partsWithQuoteCount: partsWithQuote.length,
          savingsOpportunities: savingsOpportunities.slice(0, 5),
          totalSavings: money(totalSavingsClp, 'CLP'),
          anomalies,
          expiringQuotes,
        })
        setLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { ...data, loading, error }
}
