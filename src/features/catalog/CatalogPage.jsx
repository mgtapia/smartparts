'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
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
  const { rows, totalCount, search, setSearch, categoryFilter, setCategoryFilter, categories } =
    useCatalog()

  return (
    <ContentWidth>
      <PageHeader title="Catálogo" description={`${rows.length} de ${totalCount} repuestos.`} />

      <Box sx={{ display: 'flex', gap: px(LIST_GAP), flexWrap: 'wrap', mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar por nombre o código…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260, flex: 1 }}
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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FilterChip
            label="Todas"
            active={categoryFilter === null}
            onClick={() => setCategoryFilter(null)}
          />
          {categories.map((c) => (
            <FilterChip
              key={c.path}
              label={c.labelEs}
              active={categoryFilter === c.path}
              onClick={() => setCategoryFilter(c.path)}
            />
          ))}
        </Box>
      </Box>

      <Card sx={{ p: 0.75, overflow: 'hidden' }}>
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
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ flex: 0.8, display: { xs: 'none', md: 'block' } }}
                >
                  {r.categoryLabel}
                </Typography>
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

function FilterChip({ label, active, onClick }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        border: '1px solid',
        borderColor: active ? 'secondary.main' : 'divider',
        bgcolor: active ? 'secondary.main' : 'transparent',
        color: active ? 'secondary.contrastText' : 'text.secondary',
        borderRadius: `${RADIUS.pill}px`,
        px: 1.5,
        height: 32,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </Box>
  )
}
