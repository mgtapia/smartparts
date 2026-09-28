'use client'

import { createContext } from 'react'
import Card from '@mui/material/Card'
import { usePathname } from 'next/navigation'
import { COLORS, RADIUS } from '@constants/colors'
import { hasSectionTabs } from '@constants/routes'

/** Indica a los hijos (p. ej. ListTable) que ya están dentro de un panel: no dibujan su propia tarjeta. */
export const PanelContext = createContext(false)

/**
 * Panel de contenido bajo `SectionTabs` — mismo fondo/borde/radio siempre,
 * con o sin pestañas arriba. `SectionTabs` se solapa 1px con su borde
 * superior para que la costura entre el tab activo y el panel desaparezca.
 * Con pestañas, la esquina superior derecha queda recta: el último tab
 * termina justo ahí y una curva dejaría un hueco bajo él.
 */
export default function SectionPanel({ children, sx }) {
  const withTabs = hasSectionTabs(usePathname())
  return (
    <Card
      sx={{
        bgcolor: COLORS.bg,
        border: 1,
        borderColor: 'divider',
        borderRadius: `${RADIUS.card}px`,
        borderTopRightRadius: withTabs ? 0 : `${RADIUS.card}px`,
        boxShadow: 'none',
        p: 2,
        ...sx,
      }}
    >
      <PanelContext.Provider value>{children}</PanelContext.Provider>
    </Card>
  )
}
