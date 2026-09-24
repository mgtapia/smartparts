'use client'

import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'

/**
 * Datos clave de una ficha en columnas iguales separadas por un divisor
 * vertical. Cada dato es un `InfoField`; con `onEdit` muestra un lápiz.
 */
export function InfoGrid({ children }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
      {children}
    </Box>
  )
}

export function InfoField({ label, children, onEdit }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 0.5,
        borderLeft: 1,
        borderColor: 'divider',
        '&:first-of-type': { pl: 0, borderLeft: 0 },
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 28, fontSize: 13 }}>
        {children}
        {onEdit ? (
          <Tooltip title="Editar y confirmar">
            <IconButton size="small" aria-label={`Editar ${label}`} onClick={onEdit}>
              <EditOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>
    </Box>
  )
}
