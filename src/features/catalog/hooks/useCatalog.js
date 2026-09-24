import { useEffect, useMemo, useState } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { usePersistentState } from '@hooks/usePersistentState'
import { listParts } from '@libs/repos/partsRepo'
import { getTopLevelCategories, getCategory } from '@mocks/categories'
import { listVehicles } from '@libs/repos/vehiclesRepo'
import { clpToUsd } from '@libs/fx'
import { DEFAULT_FX } from '@mocks/costParams'
import { CODE_STATUS } from '@constants/enums'

const PAGE_SIZE = 100

export const CURRENCIES = Object.freeze({ USD: 'USD', CLP: 'CLP' })

export const SORT_FIELDS = Object.freeze({
  NAME: 'name',
  VEHICLE: 'vehicle',
  CATEGORY: 'category',
  BASELINE: 'baseline',
})

export const SORT_FIELD_LABELS_ES = Object.freeze({
  [SORT_FIELDS.NAME]: 'Nombre',
  [SORT_FIELDS.VEHICLE]: 'Vehículo',
  [SORT_FIELDS.CATEGORY]: 'Categoría',
  [SORT_FIELDS.BASELINE]: 'Precio REF',
})

const SORT_VALUE_GETTERS = {
  [SORT_FIELDS.NAME]: (r) => r.nameEs,
  [SORT_FIELDS.VEHICLE]: (r) => r.vehicleLabel,
  [SORT_FIELDS.CATEGORY]: (r) => r.categoryLabel,
  [SORT_FIELDS.BASELINE]: (r) => r.baselinePriceUsd.amount,
}

function compareRows(a, b, field, sortDir) {
  // Un campo guardado de una versión anterior puede ya no existir.
  const getValue = SORT_VALUE_GETTERS[field] ?? SORT_VALUE_GETTERS[SORT_FIELDS.NAME]
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
  // Filtros, orden y moneda se recuerdan entre visitas (por navegador). La
  // búsqueda de texto no: es de una sola consulta, no una preferencia.
  const [categoryFilters, setCategoryFilters] = usePersistentState('catalog.categoryFilters', [])
  const [vehicleFilters, setVehicleFilters] = usePersistentState('catalog.vehicleFilters', [])
  const [codeStatusFilters, setCodeStatusFilters] = usePersistentState(
    'catalog.codeStatusFilters',
    [],
  )
  // null = sin restringir (todavía no tocado)
  const [priceRange, setPriceRange] = usePersistentState('catalog.priceRange', null)
  const [sortField, setSortField] = usePersistentState('catalog.sortField', SORT_FIELDS.NAME)
  const [sortDir, setSortDir] = usePersistentState('catalog.sortDir', 'asc')
  const [page, setPage] = useState(1)
  const [currency, setCurrency] = usePersistentState('catalog.currency', CURRENCIES.USD)

  const {
    data: partsData,
    loading: partsLoading,
    error: partsError,
  } = useCachedQuery('parts', listParts)
  const {
    data: vehicleData,
    loading: vehiclesLoading,
    error: vehiclesError,
  } = useCachedQuery('vehicles', listVehicles)
  const vehicles = useMemo(() => vehicleData ?? [], [vehicleData])
  const loading = partsLoading || vehiclesLoading
  const error = partsError || vehiclesError

  const allRows = useMemo(() => {
    if (!partsData) return []
    return partsData.map((p) => {
      const categoryTopPath = p.categoryPath.split('__')[0]
      // Se guardan ambas monedas del precio de referencia — la tabla
      // elige cuál pintar según el selector de moneda, el orden siempre
      // se calcula en USD (moneda común, la conversión no reordena).
      const baselinePriceUsd = clpToUsd(p.baselinePrice, DEFAULT_FX)
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
        code: p.code,
        codeStatus: p.codeStatus,
        baselinePriceUsd,
        baselinePriceClp: p.baselinePrice,
      }
    })
  }, [partsData])

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
    effectivePriceRange,
    sortField,
    sortDir,
  ])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const rows = useMemo(
    () => filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredRows, page],
  )

  // Cada FilterChip de la barra muestra su propio conteo — acá solo hace
  // falta saber si hay algo activo (para el botón "Limpiar" global).
  const hasActiveFilters =
    categoryFilters.length > 0 ||
    vehicleFilters.length > 0 ||
    codeStatusFilters.length > 0 ||
    (priceRange !== null && (priceRange[0] !== priceBounds[0] || priceRange[1] !== priceBounds[1]))

  function clearAllFilters() {
    setCategoryFilters([])
    setVehicleFilters([])
    setCodeStatusFilters([])
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
    priceBounds,
    priceRange: effectivePriceRange,
    setPriceRange,
    hasActiveFilters,
    clearAllFilters,
    sortField,
    setSortField,
    sortDir,
    setSortDir,
    currency,
    setCurrency,
    loading,
    error,
  }
}
