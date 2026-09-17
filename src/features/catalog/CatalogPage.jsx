'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import Tooltip from '@mui/material/Tooltip'
import Link from 'next/link'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import MoneyValue from '@components/common/MoneyValue'
import { CODE_STATUS, CODE_STATUS_LABELS_ES } from '@constants/enums'
import { LoadingState, ErrorState } from '@components/common/AsyncState'
import { RADIUS } from '@constants/colors'
import { LIST_GAP, px } from '@constants/layout'
import { useCatalog, SORT_OPTIONS, SORT_LABELS_ES } from './hooks/useCatalog'

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
    categoryFilter,
    setCategoryFilter,
    categories,
    vehicleFilter,
    setVehicleFilter,
    vehicles,
    codeStatusFilter,
    setCodeStatusFilter,
    sortBy,
    setSortBy,
    loading,
    error,
  } = useCatalog()

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
    <ContentWidth>
      <PageHeader title="Catálogo" description={`${filteredCount} de ${totalCount} repuestos.`} />

      <Box sx={{ display: 'flex', gap: px(LIST_GAP), flexWrap: 'wrap', mb: 2 }}>
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
        <Select
          size="small"
          displayEmpty
          value={categoryFilter ?? '__all__'}
          onChange={(e) => setCategoryFilter(e.target.value === '__all__' ? null : e.target.value)}
          sx={{ minWidth: 180, height: 44 }}
        >
          <MenuItem value="__all__">Categoría</MenuItem>
          {categories.map((c) => (
            <MenuItem key={c.path} value={c.path}>
              {c.labelEs}
            </MenuItem>
          ))}
        </Select>
        <Select
          size="small"
          displayEmpty
          value={vehicleFilter ?? '__all__'}
          onChange={(e) => setVehicleFilter(e.target.value === '__all__' ? null : e.target.value)}
          sx={{ minWidth: 200, height: 44 }}
        >
          <MenuItem value="__all__">Vehículo</MenuItem>
          {vehicles.map((v) => (
            <MenuItem key={v.id} value={v.id}>
              {v.brand} {v.shortModel}
            </MenuItem>
          ))}
        </Select>
        <Select
          size="small"
          displayEmpty
          value={codeStatusFilter ?? '__all__'}
          onChange={(e) =>
            setCodeStatusFilter(e.target.value === '__all__' ? null : e.target.value)
          }
          sx={{ minWidth: 180, height: 44 }}
        >
          <MenuItem value="__all__">Estado del código</MenuItem>
          {Object.values(CODE_STATUS).map((s) => (
            <MenuItem key={s} value={s}>
              {CODE_STATUS_LABELS_ES[s]}
            </MenuItem>
          ))}
        </Select>
        <Select
          size="small"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          sx={{ minWidth: 220, height: 44 }}
        >
          {Object.values(SORT_OPTIONS).map((s) => (
            <MenuItem key={s} value={s}>
              {SORT_LABELS_ES[s]}
            </MenuItem>
          ))}
        </Select>
      </Box>

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
          <Typography variant="overline" color="text.secondary" sx={{ flex: 1.6, lineHeight: 1 }}>
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
          <Typography variant="overline" color="text.secondary" sx={{ flex: 0.9, lineHeight: 1 }}>
            Código
          </Typography>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ flex: 0.7, lineHeight: 1, textAlign: 'right' }}
          >
            Baseline
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
            <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
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
                      <StatusIcon sx={{ fontSize: 16, color: CODE_STATUS_COLOR[r.codeStatus] }} />
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
    </ContentWidth>
  )
}
