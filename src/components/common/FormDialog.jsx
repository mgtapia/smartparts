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
import { RADIUS } from '@constants/colors'

/** Campo de un formulario en un modal: caption arriba y el control debajo. */
export function DialogField({ label, children }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {children}
    </Box>
  )
}

/** Input de texto con el alto estándar de los controles (44 px). */
export function DialogTextInput({ value, onChange, placeholder }) {
  return (
    <TextField
      size="small"
      fullWidth
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      sx={{ '& .MuiInputBase-root': { height: 44 } }}
    />
  )
}

/**
 * Modal de edición: título, campos, Cancelar y una acción principal. `onSave`
 * es asíncrono; si falla muestra el error y deja reintentar.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {() => void} props.onClose
 * @param {() => Promise<void>} props.onSave
 * @param {boolean} [props.canSave]
 * @param {string} [props.saveLabel]
 */
export default function FormDialog({
  title,
  onClose,
  onSave,
  canSave = true,
  saveLabel = 'Guardar',
  children,
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  const save = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setError(false)
    try {
      await onSave()
      onClose()
    } catch {
      setError(true)
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: `${RADIUS.input}px` } } }}
    >
      <DialogTitle variant="subtitle1">{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {children}
          {error ? (
            <Typography variant="caption" color="error.main">
              No se pudo guardar. Reintenta.
            </Typography>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <ModalActionButton label="Cancelar" onClick={onClose} />
        <ModalActionButton kind="primary" label={saveLabel} onClick={save} />
      </DialogActions>
    </Dialog>
  )
}
