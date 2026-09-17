'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import SearchIcon from '@mui/icons-material/Search'
import Link from 'next/link'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import MoneyValue from '@components/common/MoneyValue'
import Pill from '@components/common/Pill'
import { CODE_STATUS_LABELS_ES } from '@constants/enums'
import { RADIUS } from '@constants/colors'
import { LIST_GAP, px } from '@constants/layout'
import { useCatalog } from './hooks/useCatalog'

const CODE_STATUS_TONE = { confirmed: 'success', provisional: 'warning', missing: 'error' }

export default function CatalogPage() {
  const {
    rows,
    totalCount,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    categories,
    vehicleFilter,
    setVehicleFilter,
    vehicles,
  } = useCatalog()

  return (
    <ContentWidth>
      <PageHeader title="Catálogo" description={`${rows.length} de ${totalCount} repuestos.`} />

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
            rows.map((r) => (
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
                <Box sx={{ flex: 0.8, minWidth: 0, display: { xs: 'none', md: 'block' } }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {r.categoryLabel}
                  </Typography>
                  {r.subcategoryLabel ? (
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ display: 'block', fontSize: 11, lineHeight: 1.2 }}
                    >
                      {r.subcategoryLabel}
                    </Typography>
                  ) : null}
                </Box>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 0.9, minWidth: 0 }}
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
                  <Pill
                    label={CODE_STATUS_LABELS_ES[r.codeStatus]}
                    tone={CODE_STATUS_TONE[r.codeStatus]}
                  />
                </Box>
                <MoneyValue
                  money={r.baselinePrice}
                  sx={{ flex: 0.7, textAlign: 'right', fontSize: 13 }}
                />
                <Box sx={{ flex: 0.7, textAlign: 'right' }}>
                  {r.bestQuoteUsd !== null ? (
                    <MoneyValue
                      money={{
                        amount: Math.round(r.bestQuoteUsd * 100),
                        currency: 'USD',
                        scale: 2,
                      }}
                      sx={{ fontSize: 13, color: 'success.main', fontWeight: 600 }}
                    />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      —
                    </Typography>
                  )}
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Card>
    </ContentWidth>
  )
}
