'use client'

import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { CODE_STATUS, CODE_STATUS_LABELS_ES } from '@constants/enums'
import { updatePartSourcing } from '@libs/repos/partsRepo'

export default function SourcingDialog({ open, onClose, part, onSaved }) {
  const [code, setCode] = useState(part.oemCodes[0]?.code || '')
  const [codeStatus, setCodeStatus] = useState(part.codeStatus)
  const [sourcingNote, setSourcingNote] = useState(part.sourcingNote || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updatePartSourcing(part.id, { code, codeStatus, sourcingNote })
      onSaved()
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Confirmar código — {part.nameEs}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
          <TextField
            label="Código OEM"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            size="small"
            fullWidth
            placeholder="Vacío si no hay código verificado"
          />
          <TextField
            select
            label="Estado del código"
            value={codeStatus}
            onChange={(e) => setCodeStatus(e.target.value)}
            size="small"
            fullWidth
          >
            {Object.values(CODE_STATUS).map((s) => (
              <MenuItem key={s} value={s}>
                {CODE_STATUS_LABELS_ES[s]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Nota de sourcing"
            value={sourcingNote}
            onChange={(e) => setSourcingNote(e.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={3}
            placeholder="Ej: rechazado por proveedor X (fecha) — no está en su sistema doméstico. Match encontrado en AliExpress: [link]."
          />
          {error ? (
            <Typography variant="caption" color="error.main">
              No se pudo guardar: {error.message}
            </Typography>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
