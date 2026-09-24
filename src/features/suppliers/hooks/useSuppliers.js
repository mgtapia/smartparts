import { useCallback, useEffect, useMemo, useState } from 'react'
import { listSuppliers } from '@libs/repos/suppliersRepo'
import { useQuotationsData } from '@features/quotes/hooks/useQuotations'
import { FACT_KEYS, factOf } from '../constants'

/**
 * Proveedores con sus cotizaciones y cuántos de sus datos siguen sin confirmar.
 * `reload` vuelve a leer proveedores y cotizaciones después de guardar.
 */
export function useSuppliers() {
  const {
    quotations,
    loading: quotesLoading,
    error: quotesError,
    reload: reloadQuotes,
  } = useQuotationsData()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    listSuppliers()
      .then((list) => {
        if (cancelled) return
        setSuppliers(list)
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
  }, [reloadKey])

  const rows = useMemo(
    () =>
      suppliers.map((supplier) => {
        const own = quotations.filter((q) => q.supplierId === supplier.id)
        return {
          supplier,
          quotations: own,
          partCount: new Set(own.flatMap((q) => q.lines.map((l) => l.part.id))).size,
          unconfirmed: FACT_KEYS.filter((key) => !factOf(supplier, key).confirmed).length,
        }
      }),
    [suppliers, quotations],
  )

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1)
    reloadQuotes()
  }, [reloadQuotes])

  return { rows, loading: loading || quotesLoading, error: error || quotesError, reload }
}
