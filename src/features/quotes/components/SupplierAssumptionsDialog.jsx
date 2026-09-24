'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import RuleIcon from '@mui/icons-material/Rule'
import InfoNote from '@components/common/InfoNote'
import ModalActionButton from '@components/common/ModalActionButton'
import NumberField from '@components/common/NumberField'
import ToolbarIconButton from '@components/common/ToolbarIconButton'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { RADIUS } from '@constants/colors'
import { SUPPLIER_ASSUMPTIONS_HELP } from '../constants'

const INCOTERM_OPTIONS = [
  { value: 'none', label: 'No suponer' },
  { value: 'EXW', label: 'EXW' },
  { value: 'FCA', label: 'FCA' },
  { value: 'FOB', label: 'FOB' },
]

/**
 * Supuestos del proveedor mientras no haya un dato real: gastos de origen
 * EXW → FOB e Incoterm cuando la cotización no lo indica. Los datos que sí se
 * conocen (Formulario F, ubicación, puerto) no se suponen: se confirman en la
 * ficha del proveedor. Hoy los supuestos se guardan por navegador.
 */
export default function SupplierAssumptionsDialog({ supplierName, settings, onChange }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ToolbarIconButton label="Supuestos" onClick={() => setOpen(true)}>
        <RuleIcon fontSize="small" />
      </ToolbarIconButton>
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
              value={settings.originCostBp == null ? null : settings.originCostBp / 100}
              onCommit={(n) => onChange({ originCostBp: n == null ? null : Math.round(n * 100) })}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                Incoterm supuesto
              </Typography>
              <ToolbarSelectBox
                fullWidth
                label="Incoterm supuesto"
                value={settings.assumedIncoterm}
                onChange={(assumedIncoterm) => onChange({ assumedIncoterm })}
                options={INCOTERM_OPTIONS}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <ModalActionButton kind="primary" label="Cerrar" onClick={() => setOpen(false)} />
        </DialogActions>
      </Dialog>
    </>
  )
}
