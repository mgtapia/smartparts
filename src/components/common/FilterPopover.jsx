'use client'

import Popover from '@mui/material/Popover'
import Box from '@mui/material/Box'
import { RADIUS } from '@constants/colors'

/**
 * "Cáscara" del popover de filtro — padding, sombra, radio — separada del
 * trigger que lo abre. `FilterChip` la usa con una pastilla de texto,
 * `ColumnsMenu` con un ícono; cualquier filtro futuro con otro trigger la
 * reusa igual y el contenido siempre se ve idéntico.
 */
export default function FilterPopover({ anchorEl, onClose, minWidth = 220, children }) {
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{
        paper: { sx: { mt: 1, borderRadius: `${RADIUS.input}px`, boxShadow: 4 } },
      }}
    >
      <Box sx={{ p: 1.5, minWidth, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {children}
      </Box>
    </Popover>
  )
}
