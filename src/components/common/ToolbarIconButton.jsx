'use client'

import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { RADIUS } from '@constants/colors'

/**
 * Botón de la barra de herramientas que solo lleva un ícono (mismo alto y borde
 * que `ToolbarButton`). El nombre va en el tooltip y en `aria-label`.
 */
export default function ToolbarIconButton({ label, onClick, children }) {
  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        onClick={onClick}
        sx={{
          width: 44,
          height: 44,
          border: 1,
          borderColor: 'divider',
          borderRadius: `${RADIUS.input}px`,
          color: 'text.primary',
          '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  )
}
