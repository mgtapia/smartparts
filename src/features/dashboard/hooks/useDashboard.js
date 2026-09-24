import { useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { listParts } from '@libs/repos/partsRepo'
import { getMilestone } from '@libs/repos/milestoneRepo'
import { costLine, useQuotationsData } from '@features/quotes/hooks/useQuotations'
import { useCostAssumptions } from '@features/quotes/hooks/useCostAssumptions'
import { useSuppliers } from '@features/suppliers/hooks/useSuppliers'
import { buildDashboard } from '../dashboardModel'
import { SOURCING_VEHICLE_ID } from '../constants'

/**
 * Dashboard de la etapa de sourcing: junta repuestos, cotizaciones, proveedores,
 * supuestos de costo y el hito, y los resume con `buildDashboard`. Todo viene de
 * la caché compartida, así que abrirlo después de otra pantalla no vuelve a leer.
 */
export function useDashboard() {
  const parts = useCachedQuery('parts', listParts)
  const milestone = useCachedQuery('milestone', getMilestone)
  const { quotations, loading: quotesLoading, error: quotesError } = useQuotationsData()
  const { rows, loading: suppliersLoading, error: suppliersError } = useSuppliers()
  const assumptions = useCostAssumptions()
  const { mode, rates, settingsFor } = assumptions

  const loading = parts.loading || milestone.loading || quotesLoading || suppliersLoading
  const error = parts.error || milestone.error || quotesError || suppliersError

  const data = useMemo(() => {
    if (loading || error) return null
    return buildDashboard({
      vehicleId: SOURCING_VEHICLE_ID,
      parts: parts.data ?? [],
      quotations,
      suppliers: rows.map((r) => r.supplier),
      assumptions: { mode, rates, settingsFor },
      costOf: (line) => costLine(line, { mode, rates, settingsFor }),
      milestone: milestone.data ?? {},
    })
  }, [loading, error, parts.data, quotations, rows, mode, rates, settingsFor, milestone.data])

  return { data, loading, error, reloadMilestone: milestone.reload }
}
