import { useEffect, useMemo, useState } from 'react'
import { listParts } from '@libs/repos/partsRepo'
import { getTopLevelCategories, getCategory } from '@mocks/categories'
import { listVehicles } from '@libs/repos/vehiclesRepo'
import { clpToUsd } from '@libs/fx'
import { money } from '@libs/money'
import { DEFAULT_FX } from '@mocks/costParams'

const PAGE_SIZE = 100

export function useCatalog() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(null)
  const [vehicleFilter, setVehicleFilter] = useState(null)
  const [page, setPage] = useState(1)

  const [allRows, setAllRows] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([listParts(), listVehicles()])
      .then(([parts, vehicleList]) => {
        if (cancelled) return
        const rows = parts.map((p) => {
          const categoryTopPath = p.categoryPath.split('__')[0]
          const bestQuoteUsd =
            [p.quoteRollup.original.minUsd, p.quoteRollup.alternative.minUsd]
              .filter((v) => v !== null)
              .sort((a, b) => a - b)[0] ?? null
          return {
            id: p.id,
            nameEs: p.nameEs,
            // Nivel superior — el mismo que usa el filtro, para que la fila
            // calce visualmente con la categoría elegida.
            categoryLabel: getCategory(categoryTopPath)?.labelEs || categoryTopPath,
            categoryTopPath,
            vehicleId: p.vehicleId,
            vehicleLabel: p.vehicle ? `${p.vehicle.brand} ${p.vehicle.shortModel}` : p.vehicleId,
            code: p.oemCodes[0]?.code || null,
            codeStatus: p.codeStatus,
            // Baseline (CLP) convertido a USD para que sea comparable en la
            // misma columna que la mejor cotización — nunca se comparan
            // montos en monedas distintas a simple vista.
            baselinePriceUsd: clpToUsd(p.baselinePrice, DEFAULT_FX),
            bestQuotePriceUsd:
              bestQuoteUsd === null ? null : money(Math.round(bestQuoteUsd * 100), 'USD'),
          }
        })
        setAllRows(rows)
        setVehicles(vehicleList)
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

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return allRows.filter((r) => {
      if (categoryFilter && r.categoryTopPath !== categoryFilter) return false
      if (vehicleFilter && r.vehicleId !== vehicleFilter) return false
      if (!term) return true
      return r.nameEs.toLowerCase().includes(term) || (r.code || '').toLowerCase().includes(term)
    })
  }, [allRows, search, categoryFilter, vehicleFilter])

  // Volver a la página 1 cada vez que cambia el resultado filtrado — evita
  // quedar en una página vacía después de buscar/filtrar.
  useEffect(() => {
    setPage(1)
  }, [search, categoryFilter, vehicleFilter])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const rows = useMemo(
    () => filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredRows, page],
  )

  return {
    rows,
    filteredCount: filteredRows.length,
    totalCount: allRows.length,
    page,
    setPage,
    pageCount,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    categories: getTopLevelCategories(),
    vehicleFilter,
    setVehicleFilter,
    vehicles,
    loading,
    error,
  }
}
