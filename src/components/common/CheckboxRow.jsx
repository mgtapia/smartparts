'use client'

import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'

// MUI deja el control con -11px de margen y pegado al texto por default —
// se anula ese offset y se agrega espacio explícito entre check y label.
// Única fuente de verdad de cómo se ve una fila de checkbox en un popover de
// filtro (FilterPanel, ColumnsMenu, y cualquier lista de filtro futura) —
// tamaño de letra y padding del control ya vienen del tema (theme.js).
const ROW_SX = { ml: 0, '& .MuiFormControlLabel-label': { ml: 1 } }

export default function CheckboxRow({ checked, onChange, label }) {
  return (
    <FormControlLabel
      sx={ROW_SX}
      control={<Checkbox size="small" checked={checked} onChange={onChange} />}
      label={label}
    />
  )
}
