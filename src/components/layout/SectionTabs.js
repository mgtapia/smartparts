'use client'

import { usePathname, useRouter } from 'next/navigation'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { RADIUS } from '@constants/colors'
import { findNavTrail } from '@constants/routes'

// Radio del contenedor menos su borde de 1 px.
const INNER_RADIUS = `${RADIUS.input - 1}px`

/**
 * Pestañas de los módulos de una sección del menú (Catálogo → Repuestos /
 * Vehículos). El menú lateral solo lleva a la sección; el cambio entre sus
 * módulos se hace acá. Van agrupadas en un solo control de esquinas
 * redondeadas (no pastillas) para distinguirse de los botones y de `ViewTabs`.
 * Sin sección o con un solo módulo no muestra nada.
 */
export default function SectionTabs() {
  const pathname = usePathname()
  const router = useRouter()
  const trail = findNavTrail(pathname)
  if (!trail || trail.siblings.length < 2) return null

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={trail.item.key}
      aria-label="Módulos de la sección"
      onChange={(_, key) => {
        if (key) router.push(trail.siblings.find((s) => s.key === key).path)
      }}
      sx={{
        borderRadius: `${RADIUS.input}px`,
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden',
        '& .MuiToggleButtonGroup-grouped': {
          border: 0,
          borderRadius: 0,
          height: 36,
          px: 2.5,
          fontSize: 13,
          fontWeight: 400,
          textTransform: 'none',
          color: 'text.primary',
          whiteSpace: 'nowrap',
          '&:not(:first-of-type)': { borderLeft: 1, borderLeftColor: 'divider' },
          '&.Mui-selected': {
            bgcolor: 'action.selected',
            fontWeight: 600,
            boxShadow: (t) => `inset 0 0 0 1px ${t.palette.text.disabled}`,
            // Las esquinas externas siguen la curva del contenedor para que el borde no se corte.
            '&:first-of-type': {
              borderTopLeftRadius: INNER_RADIUS,
              borderBottomLeftRadius: INNER_RADIUS,
            },
            '&:last-of-type': {
              borderTopRightRadius: INNER_RADIUS,
              borderBottomRightRadius: INNER_RADIUS,
            },
          },
        },
      }}
    >
      {trail.siblings.map((s) => (
        <ToggleButton key={s.key} value={s.key}>
          {s.labelEs}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
