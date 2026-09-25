'use client'

import Typography from '@mui/material/Typography'
import FormDialog from '@components/common/FormDialog'

/** Confirma el borrado de una línea de OC. */
export default function DeleteLineDialog({ label, onDelete, onClose }) {
  return (
    <FormDialog title="Borrar línea" saveLabel="Borrar" onClose={onClose} onSave={onDelete}>
      <Typography variant="body2">{label}</Typography>
    </FormDialog>
  )
}
