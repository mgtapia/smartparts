'use client'

import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Pagination from '@mui/material/Pagination'
import IconButton from '@mui/material/IconButton'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import FilterListIcon from '@mui/icons-material/FilterList'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import Link from 'next/link'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import MoneyValue from '@components/common/MoneyValue'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { CODE_STATUS_LABELS_ES } from '@constants/enums'
import { LoadingState, ErrorState } from '@components/common/AsyncState'
import { RADIUS } from '@constants/colors'
import { useCatalog, SORT_FIELDS, SORT_FIELD_LABELS_ES, CURRENCIES } from './hooks/useCatalog'
import FilterPanel from './components/FilterPanel'
import ColumnsMenu from './components/ColumnsMenu'

const SORT_OPTIONS = Object.values(SORT_FIELDS).map((s) => ({
  value: s,
  label: SORT_FIELD_LABELS_ES[s],
}))
const CURRENCY_OPTIONS = Object.values(CURRENCIES).map((c) => ({ value: c, label: c }))

const GROUP_BY = Object.freeze({ NONE: 'none', VEHICLE: 'vehicle', CATEGORY: 'category' })
const GROUP_OPTIONS = [
  { value: GROUP_BY.NONE, label: 'Sin agrupar' },
  { value: GROUP_BY.VEHICLE, label: 'Vehículo' },
  { value: GROUP_BY.CATEGORY, label: 'Categoría' },
]
const GROUP_KEY_GETTERS = {
  [GROUP_BY.VEHICLE]: (r) => r.vehicleLabel,
  [GROUP_BY.CATEGORY]: (r) => r.categoryLabel,
}

// Ancho fijo para toda columna salvo "Repuesto" — con `flex` proporcional el
// espacio libre que le sobra a cada una varía según cuánto texto tenga esa
// fila puntual (ej. "Repuesto" corto le robaba espacio a Descripción EN/ZH,
// que quedaban apretadas). "Repuesto" es la única que se estira con lo que
// sobra, como columna principal.
const COL_WIDTH = { vehicle: 130, category: 110, code: 140, baseline: 90 }
const REPUESTO_MIN_WIDTH = 220
const ROW_GAP = 16 // px — mismo valor que `gap: 2` en el Box de la fila

const CODE_STATUS_ICON = {
  confirmed: CheckCircleIcon,
  provisional: HelpOutlineIcon,
  missing: ErrorOutlineIcon,
}
const CODE_STATUS_COLOR = {
  confirmed: 'success.main',
  provisional: 'warning.main',
  missing: 'error.main',
}

function CatalogRow({ r, isColumnVisible, currency }) {
  const StatusIcon = CODE_STATUS_ICON[r.codeStatus]
  return (
    <Box
      component={Link}
      href={`/parts/${r.id}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        height: 44,
        px: 1.5,
        borderRadius: `${RADIUS.inputSmall}px`,
        textDecoration: 'none',
        color: 'inherit',
        bgcolor: 'brand.bodyBg',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontSize: 13,
          flex: `1 1 ${REPUESTO_MIN_WIDTH}px`,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {r.nameEs}
      </Typography>
      {isColumnVisible('vehicle') ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            flex: `0 0 ${COL_WIDTH.vehicle}px`,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: { xs: 'none', sm: 'block' },
          }}
        >
          {r.vehicleLabel}
        </Typography>
      ) : null}
      {isColumnVisible('category') ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            flex: `0 0 ${COL_WIDTH.category}px`,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: { xs: 'none', md: 'block' },
          }}
        >
          {r.categoryLabel}
        </Typography>
      ) : null}
      {isColumnVisible('code') ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            flex: `0 0 ${COL_WIDTH.code}px`,
            minWidth: 0,
          }}
        >
          <Box
            component="span"
            sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: 12, color: 'text.secondary' }}
          >
            {r.code || '—'}
          </Box>
          <Tooltip title={CODE_STATUS_LABELS_ES[r.codeStatus]}>
            <StatusIcon sx={{ fontSize: 16, color: CODE_STATUS_COLOR[r.codeStatus] }} />
          </Tooltip>
        </Box>
      ) : null}
      {isColumnVisible('baseline') ? (
        <MoneyValue
          money={currency === CURRENCIES.USD ? r.baselinePriceUsd : r.baselinePriceClp}
          sx={{ flex: `0 0 ${COL_WIDTH.baseline}px`, textAlign: 'right', fontSize: 13 }}
        />
      ) : null}
    </Box>
  )
}

export default function CatalogPage() {
  const {
    rows,
    filteredCount,
    totalCount,
    page,
    setPage,
    pageCount,
    search,
    setSearch,
    categories,
    categoryFilters,
    toggleCategoryFilter,
    vehicles,
    vehicleFilters,
    toggleVehicleFilter,
    codeStatuses,
    codeStatusFilters,
    toggleCodeStatusFilter,
    priceBounds,
    priceRange,
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
  } = useCatalog()
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [hiddenColumns, setHiddenColumns] = useState(new Set())
  const isColumnVisible = (id) => !hiddenColumns.has(id)
  const toggleColumn = (id) =>
    setHiddenColumns((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  // Ancho mínimo real de la fila según las columnas visibles — si el
  // contenedor es más angosto, la tabla scrollea horizontal en vez de
  // desbordar la página (las columnas de ancho fijo no se achican).
  const tableMinWidth = useMemo(() => {
    const optionalIds = Object.keys(COL_WIDTH).filter((id) => !hiddenColumns.has(id))
    const fixedWidthSum = optionalIds.reduce((sum, id) => sum + COL_WIDTH[id], 0)
    const columnCount = 1 + optionalIds.length
    return REPUESTO_MIN_WIDTH + fixedWidthSum + (columnCount - 1) * ROW_GAP + 24
  }, [hiddenColumns])
  const [groupBy, setGroupBy] = useState(GROUP_BY.NONE)
  const groupedSections = useMemo(() => {
    const getKey = GROUP_KEY_GETTERS[groupBy]
    if (!getKey) return [{ key: null, rows }]
    const map = new Map()
    rows.forEach((r) => {
      const key = getKey(r)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    })
    return [...map.entries()].map(([key, groupRows]) => ({ key, rows: groupRows }))
  }, [rows, groupBy])

  if (loading) {
    return (
      <ContentWidth>
        <LoadingState />
      </ContentWidth>
    )
  }

  if (error) {
    return (
      <ContentWidth>
        <ErrorState />
      </ContentWidth>
    )
  }

  return (
    <ContentWidth full>
      <PageHeader title="Catálogo" description={`${filteredCount} de ${totalCount} repuestos.`} />

      {/* Fila 1: buscador + controles de vista (orden, agrupar, moneda,
          columnas). Fila 2: pastillas de filtros (referencia: Samsung.com).
          Dos filas separadas a propósito — la de arriba cambia cómo se ve
          la lista, la de abajo cambia qué incluye. */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
        <TextField
          size="small"
          placeholder="Buscar por nombre o código…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260, flex: 1, '& .MuiInputBase-root': { height: 44 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <ToolbarSelectBox
          label="Orden"
          value={sortField}
          onChange={setSortField}
          options={SORT_OPTIONS}
        />

        <Tooltip title={sortDir === 'asc' ? 'Ascendente' : 'Descendente'}>
          <IconButton
            size="small"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {sortDir === 'asc' ? (
              <ArrowUpwardIcon fontSize="small" />
            ) : (
              <ArrowDownwardIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ my: 1 }} />

        <ToolbarSelectBox
          label="Agrupar"
          value={groupBy}
          onChange={setGroupBy}
          options={GROUP_OPTIONS}
        />

        <ToolbarSelectBox
          label="Moneda"
          value={currency}
          onChange={setCurrency}
          options={CURRENCY_OPTIONS}
        />

        <ColumnsMenu hiddenColumns={hiddenColumns} onToggle={toggleColumn} />

        <Tooltip title={filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}>
          <IconButton
            size="small"
            onClick={() => setFiltersOpen((v) => !v)}
            sx={{ position: 'relative', flexShrink: 0 }}
          >
            <FilterListIcon fontSize="small" color={filtersOpen ? 'primary' : 'inherit'} />
            {hasActiveFilters ? (
              <Box
                component="span"
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                }}
              />
            ) : null}
          </IconButton>
        </Tooltip>
      </Box>

      {filtersOpen ? (
        <Box sx={{ mb: 1.5 }}>
          <FilterPanel
            categories={categories}
            categoryFilters={categoryFilters}
            toggleCategoryFilter={toggleCategoryFilter}
            vehicles={vehicles}
            vehicleFilters={vehicleFilters}
            toggleVehicleFilter={toggleVehicleFilter}
            codeStatuses={codeStatuses}
            codeStatusFilters={codeStatusFilters}
            toggleCodeStatusFilter={toggleCodeStatusFilter}
            priceBounds={priceBounds}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAllFilters}
          />
        </Box>
      ) : null}

      <Card sx={{ p: 0.75, overflow: 'hidden' }}>
        {/* Header y filas comparten este mismo contenedor con scroll — así
            scrollean horizontal juntos como una sola tabla si hay muchas
            columnas visibles, en vez de desbordar el ancho de la página. */}
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: tableMinWidth }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                height: 36,
                px: 1.5,
                mb: 0.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ flex: `1 1 ${REPUESTO_MIN_WIDTH}px`, lineHeight: 1 }}
              >
                Repuesto
              </Typography>
              {isColumnVisible('vehicle') ? (
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{
                    flex: `0 0 ${COL_WIDTH.vehicle}px`,
                    lineHeight: 1,
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  Vehículo
                </Typography>
              ) : null}
              {isColumnVisible('category') ? (
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{
                    flex: `0 0 ${COL_WIDTH.category}px`,
                    lineHeight: 1,
                    display: { xs: 'none', md: 'block' },
                  }}
                >
                  Categoría
                </Typography>
              ) : null}
              {isColumnVisible('code') ? (
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ flex: `0 0 ${COL_WIDTH.code}px`, lineHeight: 1 }}
                >
                  Código
                </Typography>
              ) : null}
              {isColumnVisible('baseline') ? (
                <Tooltip title="Precio neto que paga hoy el cliente en Chile — no es un precio FOB ni CIF de sourcing.">
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{
                      flex: `0 0 ${COL_WIDTH.baseline}px`,
                      lineHeight: 1,
                      textAlign: 'right',
                      cursor: 'help',
                    }}
                  >
                    Precio REF
                  </Typography>
                </Tooltip>
              ) : null}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {rows.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ p: 3, textAlign: 'center' }}
                >
                  Sin resultados.
                </Typography>
              ) : (
                groupedSections.map((section) => (
                  <Box key={section.key ?? 'all'}>
                    {section.key !== null ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          height: 44,
                          px: 1.5,
                          mb: '2px',
                          borderRadius: `${RADIUS.inputSmall}px`,
                          bgcolor: 'action.selected',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                          {section.key}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                          · {section.rows.length}
                        </Typography>
                      </Box>
                    ) : null}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {section.rows.map((r) => (
                        <CatalogRow
                          key={r.id}
                          r={r}
                          isColumnVisible={isColumnVisible}
                          currency={currency}
                        />
                      ))}
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </Box>
      </Card>

      {pageCount > 1 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            size="small"
          />
        </Box>
      ) : null}
    </ContentWidth>
  )
}
