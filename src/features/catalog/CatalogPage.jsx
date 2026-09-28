'use client'

import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import SectionPanel from '@components/layout/SectionPanel'
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
import InfoNote from '@components/common/InfoNote'
import Pill from '@components/common/Pill'
import MoneyValue from '@components/common/MoneyValue'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import SeaFormatSelect from '@features/costing/components/SeaFormatSelect'
import { seaFormatSuffix } from '@features/costing/partCostsModel'
import { CODE_STATUS_LABELS_ES } from '@constants/enums'
import { ErrorState } from '@components/common/AsyncState'
import { ListPageSkeleton } from '@components/common/Skeletons'
import { RADIUS } from '@constants/colors'
import { usePersistentState, SET_STORAGE } from '@hooks/usePersistentState'
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
const COL_WIDTH = { vehicle: 130, category: 110, code: 140, baseline: 90, pvp: 110, supplier: 90 }
const REPUESTO_MIN_WIDTH = 220

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

// Verde si conviene importar (el costo puesto en Chile no supera lo que el cliente paga hoy),
// rojo si no conviene, gris si falta el costo o el precio de referencia.
const PVP_NOTES = [
  'PVP neto, sin IVA: el mayor entre el precio de referencia menos el ahorro máximo del cliente y el mejor costo de la pieza original puesta en Chile con el margen mínimo, por avión y por barco (formato marítimo elegido). Se edita en Ajustes. El proveedor es el que da ese costo.',
  'Verde: se ofrece, el cliente ahorra al menos lo mínimo con el margen mínimo. Rojo: no compite. Gris: falta el costo o el precio de referencia.',
  'Son estimaciones con tarifas de referencia y pesos sin confirmar, no cotizaciones de un forwarder.',
]

const WORTH_COLOR = { true: 'success.main', false: 'error.main' }

function PvpCell({ pvp, currency }) {
  return (
    <Box
      sx={{
        flex: `1 1 ${COL_WIDTH.pvp}px`,
        textAlign: 'right',
        fontSize: 13,
        color: WORTH_COLOR[pvp.worthIt] ?? 'text.secondary',
      }}
    >
      {pvp.pvpClp ? (
        <MoneyValue money={currency === CURRENCIES.USD ? pvp.pvpUsd : pvp.pvpClp} />
      ) : (
        '—'
      )}
    </Box>
  )
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
        bgcolor: 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontSize: 13,
          flex: `2 1 ${REPUESTO_MIN_WIDTH}px`,
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
            flex: `1 1 ${COL_WIDTH.vehicle}px`,
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
            flex: `1 1 ${COL_WIDTH.category}px`,
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
            flex: `1 1 ${COL_WIDTH.code}px`,
            minWidth: 0,
          }}
        >
          <Box
            component="span"
            sx={{
              fontFamily: '"Roboto Mono", monospace',
              fontSize: 12,
              // Un código sin confirmar va en rojo, igual que en la ficha.
              color: r.codeStatus === 'confirmed' ? 'text.secondary' : 'error.main',
            }}
          >
            {r.code || 'Sin código'}
          </Box>
          <Tooltip title={CODE_STATUS_LABELS_ES[r.codeStatus]}>
            <StatusIcon sx={{ fontSize: 16, color: CODE_STATUS_COLOR[r.codeStatus] }} />
          </Tooltip>
        </Box>
      ) : null}
      {isColumnVisible('baseline') ? (
        <MoneyValue
          money={currency === CURRENCIES.USD ? r.baselinePriceUsd : r.baselinePriceClp}
          sx={{ flex: `1 1 ${COL_WIDTH.baseline}px`, textAlign: 'right', fontSize: 13 }}
        />
      ) : null}
      {isColumnVisible('pvpAir') ? <PvpCell pvp={r.pvpAir} currency={currency} /> : null}
      {isColumnVisible('pvpSea') ? <PvpCell pvp={r.pvpSea} currency={currency} /> : null}
      {isColumnVisible('supplier') ? (
        <Box sx={{ flex: `1 1 ${COL_WIDTH.supplier}px`, minWidth: 0, display: 'flex', gap: 0.5 }}>
          {[...new Set([r.pvpAir.supplier, r.pvpSea.supplier].filter(Boolean))].map((abbr) => (
            <Pill key={abbr} label={abbr} />
          ))}
          {!r.pvpAir.supplier && !r.pvpSea.supplier ? (
            <Typography variant="caption" color="text.secondary">
              —
            </Typography>
          ) : null}
        </Box>
      ) : null}
    </Box>
  )
}

export default function CatalogPage() {
  const {
    rows,
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
    seaFormat,
    extraFilters,
    loading,
    error,
  } = useCatalog()
  const [filtersOpen, setFiltersOpen] = usePersistentState('catalog.filtersOpen', true)
  const [hiddenColumns, setHiddenColumns] = usePersistentState(
    'catalog.hiddenColumns',
    new Set(),
    SET_STORAGE,
  )
  const isColumnVisible = (id) => !hiddenColumns.has(id)
  const toggleColumn = (id) =>
    setHiddenColumns((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const [groupBy, setGroupBy] = usePersistentState('catalog.groupBy', GROUP_BY.NONE)
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
        <ListPageSkeleton />
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
      <PageHeader title="Repuestos" />

      <SectionPanel>
        {/* Fila 1: buscador + controles de vista (orden, agrupar, moneda,
            columnas). Fila 2: pastillas de filtros (referencia: Samsung.com).
            Dos filas separadas a propósito — la de arriba cambia cómo se ve
            la lista, la de abajo cambia qué incluye. */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Buscar por nombre, código, categoría, vehículo o proveedor…"
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

          <SeaFormatSelect />

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
          <InfoNote paragraphs={PVP_NOTES} />
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
              extraFilters={extraFilters}
              priceBounds={priceBounds}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              hasActiveFilters={hasActiveFilters}
              onClearAll={clearAllFilters}
            />
          </Box>
        ) : null}

        {/* Se sale del padding del panel (mx/mb negativos) para que la tabla
            llegue a los bordes; el borde superior la separa de los controles
            de arriba, todo dentro del mismo panel blanco. */}
        <Box sx={{ mx: -2, mb: -2, borderTop: 1, borderColor: 'divider', overflow: 'hidden' }}>
          {/* Header y filas comparten este mismo contenedor con scroll — así
              scrollean horizontal juntos como una sola tabla si hay muchas
              columnas visibles, en vez de desbordar el ancho de la página. */}
          <Box>
            <Box>
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
                  sx={{
                    flex: `2 1 ${REPUESTO_MIN_WIDTH}px`,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                  }}
                >
                  Repuesto
                </Typography>
                {isColumnVisible('vehicle') ? (
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{
                      flex: `1 1 ${COL_WIDTH.vehicle}px`,
                      lineHeight: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
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
                      flex: `1 1 ${COL_WIDTH.category}px`,
                      lineHeight: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
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
                    sx={{
                      flex: `1 1 ${COL_WIDTH.code}px`,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                    }}
                  >
                    Código
                  </Typography>
                ) : null}
                {isColumnVisible('baseline') ? (
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{
                      flex: `1 1 ${COL_WIDTH.baseline}px`,
                      lineHeight: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textAlign: 'right',
                    }}
                  >
                    Precio REF
                  </Typography>
                ) : null}
                {isColumnVisible('pvpAir') ? (
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{
                      flex: `1 1 ${COL_WIDTH.pvp}px`,
                      lineHeight: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textAlign: 'right',
                    }}
                  >
                    PVP aéreo
                  </Typography>
                ) : null}
                {isColumnVisible('pvpSea') ? (
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{
                      flex: `1 1 ${COL_WIDTH.pvp}px`,
                      lineHeight: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textAlign: 'right',
                    }}
                  >
                    {`PVP marítimo${seaFormatSuffix(seaFormat)}`}
                  </Typography>
                ) : null}
                {isColumnVisible('supplier') ? (
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ flex: `1 1 ${COL_WIDTH.supplier}px`, lineHeight: 1 }}
                  >
                    Proveedor
                  </Typography>
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
        </Box>
      </SectionPanel>

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
