'use client'

import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Slider from '@mui/material/Slider'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import { CODE_STATUS_LABELS_ES } from '@constants/enums'
import { SIDEBAR_GAP, px } from '@constants/layout'
import { QUOTE_FILTERS, QUOTE_FILTER_LABELS_ES } from '../hooks/useCatalog'

function Section({ title, children }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

function CheckboxRow({ checked, onChange, label }) {
  return (
    <FormControlLabel
      sx={{ ml: -1, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
      control={<Checkbox size="small" checked={checked} onChange={onChange} />}
      label={label}
    />
  )
}

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
  quoteFilter,
  setQuoteFilter,
  priceBounds,
  priceRange,
  setPriceRange,
  hasActiveFilters,
  onClearAll,
}) {
  // Estado local para que el slider se mueva fluido mientras se arrastra —
  // el filtro real (y el recálculo de la tabla) se aplica recién al soltar.
  const [localPriceRange, setLocalPriceRange] = useState(priceRange)
  useEffect(() => setLocalPriceRange(priceRange), [priceRange])

  return (
    <Box
      sx={{
        width: 240,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: px(SIDEBAR_GAP),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Filtros
        </Typography>
        {hasActiveFilters ? (
          <Button size="small" onClick={onClearAll} sx={{ minWidth: 0, fontSize: 12 }}>
            Limpiar
          </Button>
        ) : null}
      </Box>

      <Divider />

      <Section title="Categoría">
        <FormGroup>
          {categories.map((c) => (
            <CheckboxRow
              key={c.path}
              checked={categoryFilters.includes(c.path)}
              onChange={() => toggleCategoryFilter(c.path)}
              label={c.labelEs}
            />
          ))}
        </FormGroup>
      </Section>

      <Divider />

      <Section title="Vehículo">
        <FormGroup>
          {vehicles.map((v) => (
            <CheckboxRow
              key={v.id}
              checked={vehicleFilters.includes(v.id)}
              onChange={() => toggleVehicleFilter(v.id)}
              label={`${v.brand} ${v.shortModel}`}
            />
          ))}
        </FormGroup>
      </Section>

      <Divider />

      <Section title="Estado del código">
        <FormGroup>
          {codeStatuses.map((s) => (
            <CheckboxRow
              key={s}
              checked={codeStatusFilters.includes(s)}
              onChange={() => toggleCodeStatusFilter(s)}
              label={CODE_STATUS_LABELS_ES[s]}
            />
          ))}
        </FormGroup>
      </Section>

      <Divider />

      <Section title="Cotización">
        <RadioGroup value={quoteFilter} onChange={(e) => setQuoteFilter(e.target.value)}>
          <FormControlLabel
            sx={{ ml: -1, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
            value={QUOTE_FILTERS.ALL}
            control={<Radio size="small" />}
            label="Todas"
          />
          <FormControlLabel
            sx={{ ml: -1, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
            value={QUOTE_FILTERS.WITH}
            control={<Radio size="small" />}
            label={QUOTE_FILTER_LABELS_ES[QUOTE_FILTERS.WITH]}
          />
          <FormControlLabel
            sx={{ ml: -1, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
            value={QUOTE_FILTERS.WITHOUT}
            control={<Radio size="small" />}
            label={QUOTE_FILTER_LABELS_ES[QUOTE_FILTERS.WITHOUT]}
          />
        </RadioGroup>
      </Section>

      <Divider />

      <Section title={`Precio actual (US$${localPriceRange[0]} – US$${localPriceRange[1]})`}>
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
      </Section>
    </Box>
  )
}
