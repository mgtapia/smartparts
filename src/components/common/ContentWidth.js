import Box from '@mui/material/Box'
import { MAX_WIDTH } from '@constants/layout'

/**
 * Ancho de contenido único del proyecto — ver .agent/DESIGN.md §Layout de anchos.
 * Un solo ancho máximo en todas las vistas, sin excepción (decisión del usuario, 2026-10-02).
 * Prohibido `sx={{ maxWidth, mx: 'auto' }}` inline: siempre este componente.
 */
export default function ContentWidth({ children, sx, ...rest }) {
  return (
    <Box sx={{ maxWidth: MAX_WIDTH, mx: 'auto', width: '100%', ...sx }} {...rest}>
      {children}
    </Box>
  )
}
