'use client'

import { useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import ToolbarButton from '@components/common/ToolbarButton'
import NumberField from './NumberField'

const FORM_F_OPTIONS = [
  { value: 'unknown', label: 'Sin confirmar' },
  { value: 'yes', label: 'Sí emite' },
  { value: 'no', label: 'No emite' },
]

/**
 * Supuestos que dependen del proveedor y alimentan el cálculo de sus costos: el
 * costo de origen (EXW → FOB) según dónde está, y si emite Formulario F. Van en
 * la cotización de ese proveedor, no entre los parámetros generales. Hoy se
 * guardan por navegador; cuando exista la edición de la ficha de proveedor,
 * estos campos se guardan ahí.
 */
export default function SupplierAssumptionsDialog({ supplierName, settings, onChange }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ToolbarButton label="Supuestos del proveedor" onClick={() => setOpen(true)} />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Supuestos — {supplierName}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="error.main" sx={{ fontSize: 13 }}>
            Estimaciones sin verificar: se confirman con el proveedor y con un forwarder.
          </Typography>
          <NumberField
            label="Costo de origen (EXW → FOB), % del precio"
            adornment="%"
            value={settings.originCostBp / 100}
            onCommit={(n) => onChange({ originCostBp: Math.round(n * 100) })}
          />
          <Select
            size="small"
            value={settings.formF}
            onChange={(e) => onChange({ formF: e.target.value })}
            fullWidth
          >
            {FORM_F_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {`Formulario F: ${o.label}`}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none' }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
