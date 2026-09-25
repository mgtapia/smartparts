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
import UncertainValue from '@components/common/UncertainValue'
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
 * Supuestos del proveedor mientras no haya un dato real: Incoterm cuando la cotización no lo
 * indica. Muestra también la distancia al puerto o aeropuerto con que se calcula el transporte
 * en China; esa distancia, el Formulario F y la ubicación no se suponen acá: se editan en la
 * ficha del proveedor. El Incoterm supuesto se guarda por navegador.
 */
export default function SupplierAssumptionsDialog({ supplierName, settings, onChange, isAir }) {
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                {isAir ? 'Distancia al aeropuerto (km)' : 'Distancia al puerto (km)'}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13, height: 44, lineHeight: '44px' }}>
                <UncertainValue
                  verified={settings.originDistanceConfirmed}
                  reason={
                    settings.originDistanceKm == null
                      ? 'Sin distancia, el transporte en China es el mayor entre el 3 % del precio y el de la distancia promedio de los otros proveedores. Se carga en la ficha del proveedor'
                      : 'Estimada, sin fuente. Se corrige en la ficha del proveedor'
                  }
                >
                  {settings.originDistanceKm == null
                    ? 'Sin dato'
                    : `${settings.originDistanceKm.toLocaleString('es-CL')} km`}
                </UncertainValue>
              </Typography>
            </Box>
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
