'use client'

import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'

const toNumber = (raw) => {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** Campo numérico con prefijo (US$, %); solo confirma valores válidos y no negativos. */
export default function NumberField({ label, value, onCommit, adornment }) {
  return (
    <TextField
      size="small"
      type="number"
      label={label}
      value={value}
      fullWidth
      onChange={(e) => {
        const n = toNumber(e.target.value)
        if (n !== null) onCommit(n)
      }}
      slotProps={{
        input: { startAdornment: <InputAdornment position="start">{adornment}</InputAdornment> },
      }}
    />
  )
}
