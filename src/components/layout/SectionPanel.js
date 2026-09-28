'use client'

import Card from '@mui/material/Card'
import { COLORS, RADIUS } from '@constants/colors'

/**
 * Panel de contenido bajo `SectionTabs` — mismo fondo/borde/radio siempre,
 * con o sin pestañas arriba. `SectionTabs` se solapa 1px con su borde
 * superior para que la costura entre el tab activo y el panel desaparezca.
 */
export default function SectionPanel({ children, sx }) {
  return (
    <Card
      sx={{
        bgcolor: COLORS.bg,
        border: 1,
        borderColor: 'divider',
        borderRadius: `${RADIUS.card}px`,
        boxShadow: 'none',
        p: 2,
        ...sx,
      }}
    >
      {children}
    </Card>
  )
}
