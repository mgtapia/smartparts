import { useMemo, useState } from 'react'
import { listParts } from '@libs/repos/partsRepo'
import { getTopLevelCategories } from '@mocks/categories'
import { listVehicles } from '@libs/repos/vehiclesRepo'

export function useCatalog() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(null)
  const [vehicleFilter, setVehicleFilter] = useState(null)

  const allRows = useMemo(
    () =>
      listParts().map((p) => ({
        id: p.id,
        nameEs: p.nameEs,
        categoryLabel: p.category?.labelEs || p.categoryPath,
        categoryTopPath: p.categoryPath.split('__')[0],
        vehicleId: p.vehicleId,
        vehicleLabel: p.vehicle ? `${p.vehicle.brand} ${p.vehicle.model}` : p.vehicleId,
        code: p.oemCodes[0]?.code || null,
        codeStatus: p.codeStatus,
        baselinePrice: p.baselinePrice,
        bestQuoteUsd:
          [p.quoteRollup.original.minUsd, p.quoteRollup.alternative.minUsd]
            .filter((v) => v !== null)
            .sort((a, b) => a - b)[0] ?? null,
      })),
    [],
  )

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allRows.filter((r) => {
      if (categoryFilter && r.categoryTopPath !== categoryFilter) return false
      if (vehicleFilter && r.vehicleId !== vehicleFilter) return false
      if (!term) return true
      return r.nameEs.toLowerCase().includes(term) || (r.code || '').toLowerCase().includes(term)
    })
  }, [allRows, search, categoryFilter, vehicleFilter])

  return {
    rows,
    totalCount: allRows.length,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    categories: getTopLevelCategories(),
    vehicleFilter,
    setVehicleFilter,
    vehicles: listVehicles(),
  }
}
