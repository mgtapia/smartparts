import Box from '@mui/material/Box'

/**
 * Bloque plano dentro de un `SectionPanel` (resumen, datos): sin borde ni sombra
 * propios, para no dibujar una tarjeta dentro de otra. Con `divider`, una línea
 * lo separa de lo que viene debajo.
 */
export default function PanelSection({ children, divider = true, sx }) {
  return (
    <Box
      sx={{
        pb: divider ? 2 : 0,
        mb: 2,
        borderBottom: divider ? 1 : 0,
        borderColor: 'divider',
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}
