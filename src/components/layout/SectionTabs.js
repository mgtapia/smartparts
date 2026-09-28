'use client'

import { usePathname, useRouter } from 'next/navigation'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { COLORS, RADIUS } from '@constants/colors'
import { findNavTrail } from '@constants/routes'

/**
 * Pestañas de los módulos de una sección del menú (Catálogo → Repuestos /
 * Vehículos). El menú lateral solo lleva a la sección; el cambio entre sus
 * módulos se hace acá. La activa se solapa 1 px con el `SectionPanel` de
 * abajo y comparte su fondo, para leerse como una solapa que sale del panel
 * (estilo pestaña de navegador); las inactivas quedan apagadas y separadas.
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
        mb: '-1px',
        position: 'relative',
        zIndex: 1,
        gap: 0.5,
        '& .MuiToggleButtonGroup-grouped': {
          border: 1,
          borderColor: 'divider',
          marginLeft: '0 !important',
          borderRadius: `${RADIUS.input}px ${RADIUS.input}px 0 0 !important`,
          height: 36,
          px: 2.5,
          fontSize: 13,
          fontWeight: 400,
          textTransform: 'none',
          color: 'text.secondary',
          bgcolor: COLORS.bgAlt,
          whiteSpace: 'nowrap',
          '&.Mui-selected': {
            bgcolor: COLORS.bg,
            color: 'text.primary',
            fontWeight: 600,
            borderBottomColor: COLORS.bg,
            cursor: 'default',
            '&:hover': { bgcolor: COLORS.bg },
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
