'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import FilterChip from '@components/common/FilterChip'

const FORM_F_OPTIONS = [
  { value: 'unknown', label: 'Sin confirmar' },
  { value: 'yes', label: 'Sí emite' },
  { value: 'no', label: 'No emite' },
]

const toNumber = (raw) => {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function NumberField({ label, value, onCommit, adornment, width = 120 }) {
  return (
    <TextField
      size="small"
      type="number"
      label={label}
      value={value}
      onChange={(e) => {
        const n = toNumber(e.target.value)
        if (n !== null) onCommit(n)
      }}
      slotProps={{
        input: { startAdornment: <InputAdornment position="start">{adornment}</InputAdornment> },
      }}
      sx={{ width }}
    />
  )
}

/**
 * Pastilla "Supuestos" de la barra de herramientas: abre en un popover (como
 * los filtros del catálogo) los supuestos que alimentan las columnas de costo.
 * Todo es una estimación sin verificar → se explica en rojo, y los costos que
 * salen de acá también van en rojo. Cuando haya cotizaciones reales de
 * forwarder y de agente de aduanas, se reemplazan por parámetros versionados.
 */
export default function CostAssumptionsMenu({
  rates,
  setRates,
  suppliers,
  settingsFor,
  updateSupplier,
  onReset,
}) {
  return (
    <FilterChip label="Supuestos" minWidth={520}>
      <Typography variant="caption" color="error.main">
        Estimaciones del equipo, sin verificar: reemplazar por cotizaciones reales de forwarder y
        del agente de aduanas.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <NumberField
          label="Aéreo (por kg)"
          adornment="US$"
          value={rates.airUsdPerKgCents / 100}
          onCommit={(n) => setRates({ ...rates, airUsdPerKgCents: Math.round(n * 100) })}
        />
        <NumberField
          label="Marítimo (por m³)"
          adornment="US$"
          value={rates.seaUsdPerRtCents / 100}
          onCommit={(n) => setRates({ ...rates, seaUsdPerRtCents: Math.round(n * 100) })}
        />
        <NumberField
          label="Arancel con TLC"
          adornment="%"
          value={rates.ftaDutyBp / 100}
          onCommit={(n) => setRates({ ...rates, ftaDutyBp: Math.round(n * 100) })}
        />
      </Box>

      {suppliers.length > 0 ? (
        <>
          <Divider />
          <Typography variant="caption" color="text.secondary">
            Por proveedor: el costo de origen (EXW → FOB) depende de dónde está, y el arancel
            preferencial de si emite Formulario F.
          </Typography>
          {suppliers.map((s) => {
            const st = settingsFor(s.id)
            return (
              <Box key={s.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography
                  variant="body2"
                  noWrap
                  title={s.name}
                  sx={{ fontSize: 13, flex: 1, minWidth: 0 }}
                >
                  {s.name}
                </Typography>
                <NumberField
                  label="Origen"
                  adornment="%"
                  width={100}
                  value={st.originCostBp / 100}
                  onCommit={(n) => updateSupplier(s.id, { originCostBp: Math.round(n * 100) })}
                />
                <Select
                  size="small"
                  value={st.formF}
                  onChange={(e) => updateSupplier(s.id, { formF: e.target.value })}
                  sx={{ width: 190 }}
                >
                  {FORM_F_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {`Form F: ${o.label}`}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            )
          })}
        </>
      ) : null}
      <Box>
        <Button size="small" onClick={onReset} sx={{ textTransform: 'none' }}>
          Restablecer supuestos
        </Button>
      </Box>
    </FilterChip>
  )
}
