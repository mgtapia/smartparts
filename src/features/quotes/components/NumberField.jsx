'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'

// Vacío = sin dato (null); un valor no numérico o negativo se ignora (undefined).
const toNumber = (raw) => {
  if (raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

/**
 * Campo numérico con el mismo estilo que los inputs de precio del filtro del
 * catálogo: caption arriba, input pequeño con prefijo (US$, %) y sin label
 * flotante. Solo confirma valores válidos y no negativos.
 */
export default function NumberField({
  label,
  value,
  onCommit,
  adornment,
  placeholder = 'Sin definir',
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <TextField
        size="small"
        type="number"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const n = toNumber(e.target.value)
          if (n !== undefined) onCommit(n)
        }}
        slotProps={{
          input: { startAdornment: <InputAdornment position="start">{adornment}</InputAdornment> },
        }}
        fullWidth
        sx={{ '& .MuiInputBase-root': { height: 44 } }}
      />
    </Box>
  )
}
