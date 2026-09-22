'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import FilterListIcon from '@mui/icons-material/FilterList'
import Tooltip from '@mui/material/Tooltip'
import Link from 'next/link'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import MoneyValue from '@components/common/MoneyValue'
import { CODE_STATUS_LABELS_ES } from '@constants/enums'
import { LoadingState, ErrorState } from '@components/common/AsyncState'
import { RADIUS } from '@constants/colors'
import { GRID_GAP, px } from '@constants/layout'
import { useCatalog, SORT_FIELDS, SORT_FIELD_LABELS_ES } from './hooks/useCatalog'
import FilterPanel from './components/FilterPanel'

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
    quoteFilter,
    setQuoteFilter,
    priceBounds,
    priceRange,
    setPriceRange,
    activeFilterChips,
    clearAllFilters,
    sortField,
    setSortField,
    sortDir,
    setSortDir,
    loading,
    error,
  } = useCatalog()
  const [filtersOpen, setFiltersOpen] = useState(true)
  const hasActiveFilters = activeFilterChips.length > 0

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

      <Box sx={{ display: 'flex', gap: px(GRID_GAP), alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', gap: px(GRID_GAP), alignItems: 'center', mb: 1.5 }}>
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

            {/* Orden — separado visualmente de los filtros (que viven en el
                panel de la derecha) con un borde propio, para que no se
                confunda con un criterio que reduce filas. */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: `${RADIUS.inputSmall}px`,
                px: 1,
                height: 44,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ whiteSpace: 'nowrap', lineHeight: 1 }}
              >
                Ordenar por
              </Typography>
              <Select
                size="small"
                variant="standard"
                disableUnderline
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                sx={{
                  minWidth: 140,
                  fontSize: 14,
                  '& .MuiSelect-select': {
                    display: 'flex',
                    alignItems: 'center',
                    lineHeight: 1,
                    py: 0,
                  },
                }}
              >
                {Object.values(SORT_FIELDS).map((s) => (
                  <MenuItem key={s} value={s}>
                    {SORT_FIELD_LABELS_ES[s]}
                  </MenuItem>
                ))}
              </Select>
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
            </Box>

            {!filtersOpen ? (
              <Tooltip title="Mostrar filtros">
                <IconButton
                  size="small"
                  onClick={() => setFiltersOpen(true)}
                  sx={{ position: 'relative', flexShrink: 0 }}
                >
                  <FilterListIcon fontSize="small" />
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
            ) : null}
          </Box>

          {activeFilterChips.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5 }}>
              {activeFilterChips.map((chip) => (
                <Chip key={chip.id} label={chip.label} size="small" onDelete={chip.onRemove} />
              ))}
            </Box>
          ) : null}

          <Card sx={{ p: 0.75, overflow: 'hidden' }}>
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
                sx={{ flex: 1.6, lineHeight: 1 }}
              >
                Repuesto
              </Typography>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ flex: 1, lineHeight: 1, display: { xs: 'none', sm: 'block' } }}
              >
                Vehículo
              </Typography>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ flex: 0.8, lineHeight: 1, display: { xs: 'none', md: 'block' } }}
              >
                Categoría
              </Typography>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ flex: 0.9, lineHeight: 1 }}
              >
                Código
              </Typography>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ flex: 0.7, lineHeight: 1, textAlign: 'right' }}
              >
                Precio actual
              </Typography>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ flex: 0.7, lineHeight: 1, textAlign: 'right' }}
              >
                Mejor cotiz.
              </Typography>
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
                rows.map((r) => {
                  const StatusIcon = CODE_STATUS_ICON[r.codeStatus]
                  return (
                    <Box
                      key={r.id}
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
                          fontWeight: 600,
                          flex: 1.6,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.nameEs}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }}
                      >
                        {r.vehicleLabel}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ flex: 0.8, minWidth: 0, display: { xs: 'none', md: 'block' } }}
                      >
                        {r.categoryLabel}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          flex: 0.9,
                          minWidth: 0,
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            fontFamily: '"Roboto Mono", monospace',
                            fontSize: 12,
                            color: 'text.secondary',
                          }}
                        >
                          {r.code || '—'}
                        </Box>
                        <Tooltip title={CODE_STATUS_LABELS_ES[r.codeStatus]}>
                          <StatusIcon
                            sx={{ fontSize: 16, color: CODE_STATUS_COLOR[r.codeStatus] }}
                          />
                        </Tooltip>
                      </Box>
                      <MoneyValue
                        money={r.baselinePriceUsd}
                        sx={{ flex: 0.7, textAlign: 'right', fontSize: 13 }}
                      />
                      <Box sx={{ flex: 0.7, textAlign: 'right' }}>
                        {r.bestQuotePriceUsd !== null ? (
                          <MoneyValue
                            money={r.bestQuotePriceUsd}
                            sx={{ fontSize: 13, color: 'success.main', fontWeight: 600 }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )
                })
              )}
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
        </Box>

        {filtersOpen ? (
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
            quoteFilter={quoteFilter}
            setQuoteFilter={setQuoteFilter}
            priceBounds={priceBounds}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAllFilters}
            onCollapse={() => setFiltersOpen(false)}
          />
        ) : null}
      </Box>
    </ContentWidth>
  )
}
