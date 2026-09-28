import Box from '@mui/material/Box'

/** Fila de herramientas de una lista: buscador, selectores, botones e InfoNote, en ese orden. */
export default function Toolbar({ children, sx }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1.5, ...sx }}>
      {children}
    </Box>
  )
}
