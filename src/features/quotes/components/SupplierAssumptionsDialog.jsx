'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import InfoNote from '@components/common/InfoNote'
import ToolbarButton from '@components/common/ToolbarButton'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { RADIUS } from '@constants/colors'
import { SUPPLIER_ASSUMPTIONS_HELP } from '../constants'
import NumberField from './NumberField'

const FORM_F_OPTIONS = [
  { value: 'unknown', label: 'Sin confirmar' },
  { value: 'yes', label: 'Emite Formulario F' },
  { value: 'no', label: 'No emite Formulario F' },
]

/**
 * Supuestos que dependen del proveedor y alimentan el cálculo de sus costos:
 * gastos de origen (EXW → FOB) según dónde está, y si emite Formulario F (de
 * eso depende que se aplique el arancel TLC). Van en la cotización de ese
 * proveedor, no entre los parámetros generales. Hoy se guardan por navegador;
 * cuando exista la edición de la ficha de proveedor, se guardan ahí.
 */
export default function SupplierAssumptionsDialog({ supplierName, settings, onChange }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ToolbarButton label="Supuestos del proveedor" onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: `${RADIUS.input}px` } } }}
      >
        <DialogTitle
          variant="subtitle1"
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          Supuestos — {supplierName}
          <InfoNote dense title="Sobre estos supuestos" paragraphs={SUPPLIER_ASSUMPTIONS_HELP} />
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 2, rowGap: 2, pt: 1 }}
          >
            <NumberField
              label="Gastos EXW → FOB (% precio EXW)"
              adornment="%"
              value={settings.originCostBp / 100}
              onCommit={(n) => onChange({ originCostBp: Math.round(n * 100) })}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                Certificado de origen (Formulario F)
              </Typography>
              <ToolbarSelectBox
                fullWidth
                label="Certificado de origen"
                value={settings.formF}
                onChange={(formF) => onChange({ formF })}
                options={FORM_F_OPTIONS}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <ToolbarButton label="Cerrar" onClick={() => setOpen(false)} />
        </DialogActions>
      </Dialog>
    </>
  )
}
