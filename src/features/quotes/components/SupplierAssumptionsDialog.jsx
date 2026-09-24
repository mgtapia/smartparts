'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import InfoNote from '@components/common/InfoNote'
import ModalActionButton from '@components/common/ModalActionButton'
import RuleIcon from '@mui/icons-material/Rule'
import ToolbarIconButton from '@components/common/ToolbarIconButton'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { RADIUS } from '@constants/colors'
import { SUPPLIER_ASSUMPTIONS_HELP } from '../constants'
import NumberField from '@components/common/NumberField'

const INCOTERM_OPTIONS = [
  { value: 'none', label: 'No suponer' },
  { value: 'EXW', label: 'EXW' },
  { value: 'FCA', label: 'FCA' },
  { value: 'FOB', label: 'FOB' },
]

const FORM_F_OPTIONS = [
  { value: 'unknown', label: 'Sin confirmar' },
  { value: 'yes', label: 'Emite' },
  { value: 'no', label: 'No emite' },
]

const FORM_F_LABELS = Object.fromEntries(FORM_F_OPTIONS.map((o) => [o.value, o.label]))

/**
 * Supuestos que dependen del proveedor y alimentan el cálculo de sus costos:
 * gastos de origen (EXW → FOB) según dónde está, y si emite Formulario F (de
 * eso depende que se aplique el arancel TLC). Van en la cotización de ese
 * proveedor, no entre los parámetros generales. Hoy se guardan por navegador;
 * cuando exista la edición de la ficha de proveedor, se guardan ahí.
 */
export default function SupplierAssumptionsDialog({ supplierName, settings, onChange }) {
  const [open, setOpen] = useState(false)
  const [editingFormF, setEditingFormF] = useState(false)
  // Un dato ya confirmado no se edita de pasada: se corrige con una acción explícita.
  const formFLocked = settings.formF !== 'unknown' && !editingFormF

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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                Formulario F
              </Typography>
              {formFLocked ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 44 }}>
                  <Typography variant="body2" sx={{ fontSize: 13 }}>
                    {FORM_F_LABELS[settings.formF]}
                  </Typography>
                  <ModalActionButton label="Corregir" onClick={() => setEditingFormF(true)} />
                </Box>
              ) : (
                <ToolbarSelectBox
                  fullWidth
                  label="Certificado de origen"
                  value={settings.formF}
                  onChange={(formF) => {
                    onChange({ formF })
                    setEditingFormF(false)
                  }}
                  options={FORM_F_OPTIONS}
                />
              )}
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
