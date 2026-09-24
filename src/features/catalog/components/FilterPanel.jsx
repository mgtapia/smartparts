'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import FormGroup from '@mui/material/FormGroup'
import Slider from '@mui/material/Slider'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import FilterChip from '@components/common/FilterChip'
import CheckboxRow from '@components/common/CheckboxRow'
import { CODE_STATUS_LABELS_ES } from '@constants/enums'

/**
 * Barra horizontal de filtros — un `FilterChip` por dimensión (referencia:
 * Samsung.com), en vez del panel lateral fijo que había antes. Cada pastilla
 * abre sus propios controles en un popover; el conteo en la pastilla
 * reemplaza a la fila aparte de chips removibles que había antes.
 */
export default function FilterPanel({
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
  onClearAll,
}) {
  // Estado local para que el slider (y los inputs) se muevan fluido mientras
  // se editan — el filtro real (y el recálculo de la tabla) se aplica recién
  // al soltar el slider o al confirmar un input (blur/Enter).
  const [localPriceRange, setLocalPriceRange] = useState(priceRange)
  useEffect(() => setLocalPriceRange(priceRange), [priceRange])

  function commitMin(raw) {
    const parsed = Number(raw)
    const clamped = Number.isNaN(parsed)
      ? priceBounds[0]
      : Math.min(Math.max(parsed, priceBounds[0]), localPriceRange[1])
    const next = [clamped, localPriceRange[1]]
    setLocalPriceRange(next)
    setPriceRange(next)
  }

  function commitMax(raw) {
    const parsed = Number(raw)
    const clamped = Number.isNaN(parsed)
      ? priceBounds[1]
      : Math.max(Math.min(parsed, priceBounds[1]), localPriceRange[0])
    const next = [localPriceRange[0], clamped]
    setLocalPriceRange(next)
    setPriceRange(next)
  }

  function blurOnEnter(e) {
    if (e.key === 'Enter') e.target.blur()
  }

  const priceActive = priceRange[0] !== priceBounds[0] || priceRange[1] !== priceBounds[1]

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <FilterChip label="Categoría" activeCount={categoryFilters.length}>
        <FormGroup sx={{ gap: 0.5 }}>
          {categories.map((c) => (
            <CheckboxRow
              key={c.path}
              checked={categoryFilters.includes(c.path)}
              onChange={() => toggleCategoryFilter(c.path)}
              label={c.labelEs}
            />
          ))}
        </FormGroup>
      </FilterChip>

      <FilterChip label="Vehículo" activeCount={vehicleFilters.length}>
        <FormGroup sx={{ gap: 0.5 }}>
          {vehicles.map((v) => (
            <CheckboxRow
              key={v.id}
              checked={vehicleFilters.includes(v.id)}
              onChange={() => toggleVehicleFilter(v.id)}
              label={`${v.brand} ${v.shortModel}`}
            />
          ))}
        </FormGroup>
      </FilterChip>

      <FilterChip label="Estado del código" activeCount={codeStatusFilters.length}>
        <FormGroup sx={{ gap: 0.5 }}>
          {codeStatuses.map((s) => (
            <CheckboxRow
              key={s}
              checked={codeStatusFilters.includes(s)}
              onChange={() => toggleCodeStatusFilter(s)}
              label={CODE_STATUS_LABELS_ES[s]}
            />
          ))}
        </FormGroup>
      </FilterChip>

      <FilterChip label="Precio" activeCount={priceActive ? 1 : 0} minWidth={260}>
        <Typography variant="caption" color="text.secondary">
          Precio REF
        </Typography>
        <Box sx={{ px: 1 }}>
          <Slider
            size="small"
            value={localPriceRange}
            min={priceBounds[0]}
            max={priceBounds[1]}
            onChange={(_, value) => setLocalPriceRange(value)}
            onChangeCommitted={(_, value) => setPriceRange(value)}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `US$${v}`}
            disabled={priceBounds[0] === priceBounds[1]}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <TextField
            size="small"
            type="number"
            value={localPriceRange[0]}
            onChange={(e) => setLocalPriceRange([Number(e.target.value), localPriceRange[1]])}
            onBlur={(e) => commitMin(e.target.value)}
            onKeyDown={blurOnEnter}
            disabled={priceBounds[0] === priceBounds[1]}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">US$</InputAdornment> },
            }}
            sx={{ width: 108 }}
          />
          <TextField
            size="small"
            type="number"
            value={localPriceRange[1]}
            onChange={(e) => setLocalPriceRange([localPriceRange[0], Number(e.target.value)])}
            onBlur={(e) => commitMax(e.target.value)}
            onKeyDown={blurOnEnter}
            disabled={priceBounds[0] === priceBounds[1]}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">US$</InputAdornment> },
            }}
            sx={{ width: 108 }}
          />
        </Box>
      </FilterChip>

      {hasActiveFilters ? (
        <Button size="small" onClick={onClearAll} sx={{ fontSize: 13, textTransform: 'none' }}>
          Limpiar
        </Button>
      ) : null}
    </Box>
  )
}
