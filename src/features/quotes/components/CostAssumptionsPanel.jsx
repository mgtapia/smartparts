'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import { SHIPPING_MODES, SHIPPING_MODE_LABELS_ES } from '@constants/enums'

const MODES = [SHIPPING_MODES.SEA_LCL, SHIPPING_MODES.AIR]
const FORM_F_OPTIONS = [
  { value: 'unknown', label: 'Sin confirmar' },
  { value: 'yes', label: 'Sí emite' },
  { value: 'no', label: 'No emite' },
]

const toNumber = (raw) => {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function NumberField({ label, value, onCommit, adornment, width = 130 }) {
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
 * Supuestos que alimentan las columnas de costo. Todo es una estimación sin
 * verificar (rojo): cuando haya cotizaciones reales de forwarder y de agente de
 * aduanas, estos valores se reemplazan por parámetros versionados.
 */
export default function CostAssumptionsPanel({
  mode,
  setMode,
  rates,
  setRates,
  suppliers,
  settingsFor,
  updateSupplier,
  onReset,
}) {
  return (
    <Card sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Supuestos del cálculo
        </Typography>
        <Button size="small" onClick={onReset} sx={{ textTransform: 'none' }}>
          Restablecer
        </Button>
      </Box>
      <Typography variant="caption" color="error.main" sx={{ display: 'block', mb: 2 }}>
        Estimaciones del equipo, sin verificar: reemplazar por cotizaciones reales de forwarder y
        del agente de aduanas. Por eso todos los costos calculados se muestran en rojo.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Select
          size="small"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          sx={{ width: 160 }}
        >
          {MODES.map((m) => (
            <MenuItem key={m} value={m}>
              {SHIPPING_MODE_LABELS_ES[m]}
            </MenuItem>
          ))}
        </Select>
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
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Por proveedor: el costo de origen (EXW → FOB) depende de dónde está, y el arancel
            preferencial de si emite Formulario F.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {suppliers.map((s) => {
              const st = settingsFor(s.id)
              return (
                <Box
                  key={s.id}
                  sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <Typography variant="body2" sx={{ width: 260 }}>
                    {s.name}
                  </Typography>
                  <NumberField
                    label="Costo de origen"
                    adornment="%"
                    value={st.originCostBp / 100}
                    onCommit={(n) => updateSupplier(s.id, { originCostBp: Math.round(n * 100) })}
                  />
                  <Select
                    size="small"
                    value={st.formF}
                    onChange={(e) => updateSupplier(s.id, { formF: e.target.value })}
                    sx={{ width: 150 }}
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
          </Box>
        </>
      ) : null}
    </Card>
  )
}
