import { useCallback, useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { listSuppliers } from '@libs/repos/suppliersRepo'
import { useQuotationsData } from '@features/quotes/hooks/useQuotations'

/**
 * Proveedores con sus cotizaciones.
 * `reload` vuelve a leer proveedores y cotizaciones después de guardar.
 */
export function useSuppliers() {
  const {
    quotations,
    loading: quotesLoading,
    error: quotesError,
    reload: reloadQuotes,
  } = useQuotationsData()
  const {
    data,
    loading,
    error,
    reload: reloadSuppliers,
  } = useCachedQuery('suppliers', listSuppliers)
  const suppliers = useMemo(() => data ?? [], [data])

  const rows = useMemo(
    () =>
      suppliers.map((supplier) => {
        const own = quotations.filter((q) => q.supplierId === supplier.id)
        return {
          supplier,
          quotations: own,
          partCount: new Set(own.flatMap((q) => q.lines.map((l) => l.part.id))).size,
        }
      }),
    [suppliers, quotations],
  )

  const reload = useCallback(() => {
    reloadSuppliers()
    reloadQuotes()
  }, [reloadSuppliers, reloadQuotes])

  return { rows, loading: loading || quotesLoading, error: error || quotesError, reload }
}
