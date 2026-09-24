'use client'

import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'

/**
 * Datos clave de una ficha en columnas iguales separadas por un divisor
 * vertical. Cada dato es un `InfoField`; con `onEdit` muestra un lápiz. Con
 * `columns` fija la cantidad de columnas (todas de igual ancho); sin ella se
 * reparte según el espacio.
 */
export function InfoGrid({ columns, children }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: columns
          ? `repeat(${columns}, minmax(0, 1fr))`
          : 'repeat(auto-fit, minmax(150px, 1fr))',
      }}
    >
      {children}
    </Box>
  )
}

/** `hint`: detalle del dato, se ve al pasar el mouse por el ícono junto al rótulo. */
/** `divided`: mantiene el divisor y el espacio a la izquierda del primer dato, cuando hay una imagen antes. */
export function InfoField({ label, children, onEdit, hint, divided = false }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 0.5,
        borderLeft: 1,
        borderColor: 'divider',
        '&:first-of-type': divided ? {} : { pl: 0, borderLeft: 0 },
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
        {hint ? (
          <Tooltip title={hint}>
            <HelpOutlineIcon sx={{ fontSize: 13, ml: 0.5, verticalAlign: 'text-bottom' }} />
          </Tooltip>
        ) : null}
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
