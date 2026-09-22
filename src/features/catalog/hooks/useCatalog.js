import { useEffect, useMemo, useState } from 'react'
import { listParts } from '@libs/repos/partsRepo'
import { getTopLevelCategories, getCategory } from '@mocks/categories'
import { listVehicles } from '@libs/repos/vehiclesRepo'
import { clpToUsd } from '@libs/fx'
import { money } from '@libs/money'
import { DEFAULT_FX } from '@mocks/costParams'
import { CODE_STATUS, CODE_STATUS_LABELS_ES } from '@constants/enums'

const PAGE_SIZE = 100

export const SORT_FIELDS = Object.freeze({
  NAME: 'name',
  BASELINE: 'baseline',
  QUOTE: 'quote',
  SAVINGS: 'savings',
})

export const SORT_FIELD_LABELS_ES = Object.freeze({
  [SORT_FIELDS.NAME]: 'Nombre',
  [SORT_FIELDS.BASELINE]: 'Precio actual',
  [SORT_FIELDS.QUOTE]: 'Mejor cotización',
  [SORT_FIELDS.SAVINGS]: 'Ahorro estimado',
})

export const QUOTE_FILTERS = Object.freeze({
  ALL: 'all',
  WITH: 'with',
  WITHOUT: 'without',
})

export const QUOTE_FILTER_LABELS_ES = Object.freeze({
  [QUOTE_FILTERS.WITH]: 'Con cotización',
  [QUOTE_FILTERS.WITHOUT]: 'Sin cotización',
})

const SORT_VALUE_GETTERS = {
  [SORT_FIELDS.NAME]: (r) => r.nameEs,
  [SORT_FIELDS.BASELINE]: (r) => r.baselinePriceUsd.amount,
  [SORT_FIELDS.QUOTE]: (r) => r.bestQuotePriceUsd?.amount ?? null,
  [SORT_FIELDS.SAVINGS]: (r) => r.savingsUsd,
}

// Filas sin cotización (o sin ahorro calculable) siempre al final, tanto en
// ascendente como en descendente — solo el orden entre las que sí tienen
// valor se invierte con `sortDir`.
function compareRows(a, b, field, sortDir) {
  const getValue = SORT_VALUE_GETTERS[field]
  const av = getValue(a)
  const bv = getValue(b)
  if (av === null || av === undefined) return bv === null || bv === undefined ? 0 : 1
  if (bv === null || bv === undefined) return -1
  const cmp = typeof av === 'string' ? av.localeCompare(bv, 'es') : av - bv
  return sortDir === 'asc' ? cmp : -cmp
}

function toggleInList(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function useCatalog() {
  const [search, setSearch] = useState('')
  const [categoryFilters, setCategoryFilters] = useState([])
  const [vehicleFilters, setVehicleFilters] = useState([])
  const [codeStatusFilters, setCodeStatusFilters] = useState([])
  const [quoteFilter, setQuoteFilter] = useState(QUOTE_FILTERS.ALL)
  const [priceRange, setPriceRange] = useState(null) // null = sin restringir (todavía no tocado)
  const [sortField, setSortField] = useState(SORT_FIELDS.NAME)
  const [sortDir, setSortDir] = useState('asc')
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
            // Código local (Chile) — el que reconoce el comprador local. El
            // de sourcing (China/fábrica), cuando existe, se ve en la ficha.
            code: p.localCode?.code || null,
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

  // Límites reales del baseline (USD) para el slider de precio — se recalculan
  // solo cuando llegan los datos, no en cada render.
  const priceBounds = useMemo(() => {
    if (allRows.length === 0) return [0, 0]
    const amounts = allRows.map((r) => r.baselinePriceUsd.amount / 100)
    return [Math.floor(Math.min(...amounts)), Math.ceil(Math.max(...amounts))]
  }, [allRows])

  const effectivePriceRange = priceRange ?? priceBounds

  const categories = getTopLevelCategories()

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const [minPrice, maxPrice] = effectivePriceRange
    const filtered = allRows.filter((r) => {
      if (categoryFilters.length && !categoryFilters.includes(r.categoryTopPath)) return false
      if (vehicleFilters.length && !vehicleFilters.includes(r.vehicleId)) return false
      if (codeStatusFilters.length && !codeStatusFilters.includes(r.codeStatus)) return false
      if (quoteFilter === QUOTE_FILTERS.WITH && r.bestQuotePriceUsd === null) return false
      if (quoteFilter === QUOTE_FILTERS.WITHOUT && r.bestQuotePriceUsd !== null) return false
      const baselineUsd = r.baselinePriceUsd.amount / 100
      if (baselineUsd < minPrice || baselineUsd > maxPrice) return false
      if (
        term &&
        !r.nameEs.toLowerCase().includes(term) &&
        !(r.code || '').toLowerCase().includes(term)
      ) {
        return false
      }
      return true
    })
    return filtered.sort((a, b) => compareRows(a, b, sortField, sortDir))
  }, [
    allRows,
    search,
    categoryFilters,
    vehicleFilters,
    codeStatusFilters,
    quoteFilter,
    effectivePriceRange,
    sortField,
    sortDir,
  ])

  // Volver a la página 1 cada vez que cambia el resultado filtrado — evita
  // quedar en una página vacía después de buscar/filtrar.
  useEffect(() => {
    setPage(1)
  }, [
    search,
    categoryFilters,
    vehicleFilters,
    codeStatusFilters,
    quoteFilter,
    effectivePriceRange,
    sortField,
    sortDir,
  ])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const rows = useMemo(
    () => filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredRows, page],
  )

  // Un chip por valor de filtro activo — la UI solo los renderiza, no conoce
  // de dónde sale cada uno.
  const activeFilterChips = useMemo(() => {
    const chips = []
    categoryFilters.forEach((path) => {
      chips.push({
        id: `category:${path}`,
        label: `Categoría: ${getCategory(path)?.labelEs || path}`,
        onRemove: () => setCategoryFilters((prev) => prev.filter((v) => v !== path)),
      })
    })
    vehicleFilters.forEach((id) => {
      const v = vehicles.find((veh) => veh.id === id)
      chips.push({
        id: `vehicle:${id}`,
        label: `Vehículo: ${v ? `${v.brand} ${v.shortModel}` : id}`,
        onRemove: () => setVehicleFilters((prev) => prev.filter((v2) => v2 !== id)),
      })
    })
    codeStatusFilters.forEach((status) => {
      chips.push({
        id: `code:${status}`,
        label: `Código: ${CODE_STATUS_LABELS_ES[status]}`,
        onRemove: () => setCodeStatusFilters((prev) => prev.filter((v) => v !== status)),
      })
    })
    if (quoteFilter !== QUOTE_FILTERS.ALL) {
      chips.push({
        id: 'quote',
        label: QUOTE_FILTER_LABELS_ES[quoteFilter],
        onRemove: () => setQuoteFilter(QUOTE_FILTERS.ALL),
      })
    }
    if (priceRange && (priceRange[0] !== priceBounds[0] || priceRange[1] !== priceBounds[1])) {
      chips.push({
        id: 'price',
        label: `Precio: US$${priceRange[0]} – US$${priceRange[1]}`,
        onRemove: () => setPriceRange(null),
      })
    }
    return chips
  }, [
    categoryFilters,
    vehicleFilters,
    codeStatusFilters,
    quoteFilter,
    priceRange,
    priceBounds,
    vehicles,
  ])

  function clearAllFilters() {
    setCategoryFilters([])
    setVehicleFilters([])
    setCodeStatusFilters([])
    setQuoteFilter(QUOTE_FILTERS.ALL)
    setPriceRange(null)
  }

  return {
    rows,
    filteredCount: filteredRows.length,
    totalCount: allRows.length,
    page,
    setPage,
    pageCount,
    search,
    setSearch,
    categories,
    categoryFilters,
    toggleCategoryFilter: (path) => setCategoryFilters((prev) => toggleInList(prev, path)),
    vehicles,
    vehicleFilters,
    toggleVehicleFilter: (id) => setVehicleFilters((prev) => toggleInList(prev, id)),
    codeStatuses: Object.values(CODE_STATUS),
    codeStatusFilters,
    toggleCodeStatusFilter: (s) => setCodeStatusFilters((prev) => toggleInList(prev, s)),
    quoteFilter,
    setQuoteFilter,
    priceBounds,
    priceRange: effectivePriceRange,
    setPriceRange,
    activeFilterChips,
    clearAllFilters,
    sortField,
    setSortField,
    sortDir,
    setSortDir,
    loading,
    error,
  }
}
