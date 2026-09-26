'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { RADIUS } from '@constants/colors'

/**
 * Pestañas para cambiar entre vistas de una misma página (ej. por proveedor /
 * por repuesto). No es un filtro: cambia qué se está mirando, por eso va justo
 * bajo el título y no en la barra de herramientas. Usa el mismo lenguaje que
 * las pastillas de filtro (borde, 13 px, sin negrita); la vista activa se
 * resalta igual que un filtro activo.
 *
 * @param {Object} props
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {Array<{ value: string, label: string }>} props.tabs
 * @param {Object} [props.sx]  Ajustes de posición (ej. `mb: 0` para alinearlas con el título).
 */
export default function ViewTabs({ value, onChange, tabs, sx }) {
  return (
    <Box role="tablist" sx={{ display: 'flex', gap: 1, mb: 2, ...sx }}>
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <Button
            key={t.value}
            role="tab"
            aria-selected={active}
            variant="outlined"
            onClick={() => onChange(t.value)}
            sx={{
              borderRadius: `${RADIUS.pill}px`,
              borderColor: active ? 'primary.main' : 'divider',
              bgcolor: active ? 'action.hover' : 'transparent',
              color: 'text.primary',
              fontSize: 13,
              fontWeight: 400,
              textTransform: 'none',
              px: 2.5,
              height: 36,
              whiteSpace: 'nowrap',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
            }}
          >
            {t.label}
          </Button>
        )
      })}
    </Box>
  )
}
