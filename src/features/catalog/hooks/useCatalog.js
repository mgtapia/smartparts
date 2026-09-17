import { useEffect, useMemo, useState } from 'react'
import { listParts } from '@libs/repos/partsRepo'
import { getTopLevelCategories, getCategory } from '@mocks/categories'
import { listVehicles } from '@libs/repos/vehiclesRepo'
import { clpToUsd } from '@libs/fx'
import { money } from '@libs/money'
import { DEFAULT_FX } from '@mocks/costParams'

const PAGE_SIZE = 100

export const SORT_OPTIONS = Object.freeze({
  NAME_ASC: 'name_asc',
  BASELINE_DESC: 'baseline_desc',
  QUOTE_DESC: 'quote_desc',
  SAVINGS_DESC: 'savings_desc',
})

export const SORT_LABELS_ES = Object.freeze({
  [SORT_OPTIONS.NAME_ASC]: 'Nombre (A-Z)',
  [SORT_OPTIONS.BASELINE_DESC]: 'Baseline (mayor a menor)',
  [SORT_OPTIONS.QUOTE_DESC]: 'Mejor cotización (mayor a menor)',
  [SORT_OPTIONS.SAVINGS_DESC]: 'Ahorro estimado (mayor a menor)',
})

const SORTERS = {
  [SORT_OPTIONS.NAME_ASC]: (a, b) => a.nameEs.localeCompare(b.nameEs, 'es'),
  [SORT_OPTIONS.BASELINE_DESC]: (a, b) => b.baselinePriceUsd.amount - a.baselinePriceUsd.amount,
  [SORT_OPTIONS.QUOTE_DESC]: (a, b) => nullsLast(a.bestQuotePriceUsd, b.bestQuotePriceUsd),
  [SORT_OPTIONS.SAVINGS_DESC]: (a, b) => nullsLast(a.savingsUsd, b.savingsUsd, true),
}

// Filas sin cotización (o sin ahorro calculable) siempre al final,
// cualquiera sea el criterio de orden elegido.
function nullsLast(a, b, isPlainNumber = false) {
  const av = isPlainNumber ? a : a?.amount
  const bv = isPlainNumber ? b : b?.amount
  if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1
  if (bv === null || bv === undefined) return -1
  return bv - av
}

export function useCatalog() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(null)
  const [vehicleFilter, setVehicleFilter] = useState(null)
  const [codeStatusFilter, setCodeStatusFilter] = useState(null)
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.NAME_ASC)
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
          const baselinePriceUsd = clpToUsd(p.baselinePrice, DEFAULT_FX)
          const bestQuotePriceUsd =
            bestQuoteUsd === null ? null : money(Math.round(bestQuoteUsd * 100), 'USD')
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
            baselinePriceUsd,
            bestQuotePriceUsd,
            savingsUsd:
              bestQuotePriceUsd === null
                ? null
                : baselinePriceUsd.amount - bestQuotePriceUsd.amount,
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
    const filtered = allRows.filter((r) => {
      if (categoryFilter && r.categoryTopPath !== categoryFilter) return false
      if (vehicleFilter && r.vehicleId !== vehicleFilter) return false
      if (codeStatusFilter && r.codeStatus !== codeStatusFilter) return false
      if (
        term &&
        !r.nameEs.toLowerCase().includes(term) &&
        !(r.code || '').toLowerCase().includes(term)
      ) {
        return false
      }
      return true
    })
    return filtered.sort(SORTERS[sortBy])
  }, [allRows, search, categoryFilter, vehicleFilter, codeStatusFilter, sortBy])

  // Volver a la página 1 cada vez que cambia el resultado filtrado — evita
  // quedar en una página vacía después de buscar/filtrar.
  useEffect(() => {
    setPage(1)
  }, [search, categoryFilter, vehicleFilter, codeStatusFilter, sortBy])

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
    codeStatusFilter,
    setCodeStatusFilter,
    sortBy,
    setSortBy,
    loading,
    error,
  }
}
