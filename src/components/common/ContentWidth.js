import Box from '@mui/material/Box'
import { MAX_WIDTH } from '@constants/layout'

/**
 * Ancho de contenido único del proyecto — ver .agent/DESIGN.md §Layout de anchos.
 * Prohibido `sx={{ maxWidth, mx: 'auto' }}` inline: siempre este componente.
 */
export default function ContentWidth({ full = false, children, sx, ...rest }) {
  return (
    <Box sx={{ maxWidth: full ? '100%' : MAX_WIDTH, mx: 'auto', width: '100%', ...sx }} {...rest}>
      {children}
    </Box>
  )
}
