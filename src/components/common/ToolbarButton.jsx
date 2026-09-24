'use client'

import Button from '@mui/material/Button'
import { RADIUS } from '@constants/colors'

/**
 * Botón de la barra de herramientas para acciones (abrir un modal, etc.): mismo
 * lenguaje que las pastillas de filtro (pill, 44 px, 13 px, sin negrita) pero
 * sin chevron, porque no despliega una lista sino que abre otra cosa.
 */
export default function ToolbarButton({ label, onClick, startIcon }) {
  return (
    <Button
      variant="outlined"
      onClick={onClick}
      startIcon={startIcon}
      sx={{
        borderRadius: `${RADIUS.pill}px`,
        borderColor: 'divider',
        color: 'text.primary',
        fontSize: 13,
        fontWeight: 400,
        textTransform: 'none',
        px: 2.5,
        height: 44,
        whiteSpace: 'nowrap',
        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
      }}
    >
      {label}
    </Button>
  )
}
