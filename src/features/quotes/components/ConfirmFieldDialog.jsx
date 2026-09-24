'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ModalActionButton from '@components/common/ModalActionButton'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { RADIUS } from '@constants/colors'

const INPUT_SX = { '& .MuiInputBase-root': { height: 44 } }

/**
 * Confirma o corrige un dato de la cotización. Pide el valor y la fuente (chat,
 * proforma, correo…): sin fuente no se confirma. `options` vacío = texto libre.
 * Al confirmar el dato deja de mostrarse en rojo.
 *
 * @param {Object} props
 * @param {string} props.label         Nombre del dato.
 * @param {string} props.initial       Valor actual ('' si no hay).
 * @param {Array<{value: string, label: string}>} [props.options]
 * @param {(value: string, source: string) => Promise<void>} props.onConfirm
 * @param {() => void} props.onClose
 */
export default function ConfirmFieldDialog({ label, initial, options, onConfirm, onClose }) {
  const [value, setValue] = useState(initial ?? '')
  const [source, setSource] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const canSave = value.trim() !== '' && source.trim() !== '' && !saving

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await onConfirm(value.trim(), source.trim())
      onClose()
    } catch {
      setError('No se pudo guardar. Reintenta.')
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: `${RADIUS.input}px` } } }}
    >
      <DialogTitle variant="subtitle1">Confirmar {label}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            {options ? (
              <ToolbarSelectBox
                fullWidth
                label={label}
                value={value}
                onChange={setValue}
                options={options}
              />
            ) : (
              <TextField
                size="small"
                fullWidth
                value={value}
                onChange={(e) => setValue(e.target.value)}
                sx={INPUT_SX}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Typography variant="caption" color="text.secondary">
              Fuente
            </Typography>
            <TextField
              size="small"
              fullWidth
              placeholder="Chat 24-09, proforma, correo"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              sx={INPUT_SX}
            />
          </Box>
          {error ? (
            <Typography variant="caption" color="error.main">
              {error}
            </Typography>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <ModalActionButton label="Cancelar" onClick={onClose} />
        <ModalActionButton kind="primary" label="Confirmar" onClick={canSave ? save : () => {}} />
      </DialogActions>
    </Dialog>
  )
}
