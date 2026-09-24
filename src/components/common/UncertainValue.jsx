'use client'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'

/**
 * Regla del proyecto: todo lo que no esté claro o verificado se muestra en
 * rojo, siempre. Envuelve cualquier valor; si `verified` es falso lo pinta con
 * el color de error del theme y explica el motivo en un tooltip. Cuando el
 * dato pasa a confirmado, sale del rojo sin tocar el llamador.
 */
export default function UncertainValue({ verified, reason, children, sx }) {
  if (verified)
    return (
      <Box component="span" sx={sx}>
        {children}
      </Box>
    )
  return (
    <Tooltip title={reason || 'Sin verificar'} arrow>
      <Box component="span" sx={{ color: 'error.main', cursor: 'help', ...sx }}>
        {children}
      </Box>
    </Tooltip>
  )
}
