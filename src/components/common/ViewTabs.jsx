'use client'

import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { RADIUS } from '@constants/colors'

/**
 * Pestañas para cambiar entre vistas de una misma página (ej. por proveedor /
 * por repuesto). No es un filtro: cambia qué se está mirando, por eso va justo
 * bajo el título y no en la barra de herramientas.
 *
 * `Tabs` de MUI, no botones sueltos — se confundían con acciones de la página
 * (decisión del usuario, 2026-10-02). El indicador se estiliza como una
 * píldora blanca detrás de la pestaña activa, en vez del subrayado por
 * defecto; MUI anima su deslizamiento solo.
 *
 * @param {Object} props
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {Array<{ value: string, label: string }>} props.tabs
 */
export default function ViewTabs({ value, onChange, tabs }) {
  return (
    <Tabs
      value={value}
      onChange={(_, v) => onChange(v)}
      slotProps={{
        indicator: {
          sx: {
            height: '100%',
            borderRadius: `${RADIUS.pill}px`,
            bgcolor: 'background.paper',
            boxShadow: 1,
          },
        },
      }}
      sx={{
        display: 'inline-flex',
        minHeight: 0,
        mb: 2,
        p: 0.5,
        bgcolor: 'brand.bodyBg',
        borderRadius: `${RADIUS.pill}px`,
        '& .MuiTabs-indicator': { transition: 'left 200ms, width 200ms' },
      }}
    >
      {tabs.map((t) => (
        <Tab
          key={t.value}
          value={t.value}
          label={t.label}
          disableRipple
          sx={{
            position: 'relative',
            zIndex: 1,
            minHeight: 32,
            minWidth: 0,
            borderRadius: `${RADIUS.pill}px`,
            fontSize: 13,
            fontWeight: 400,
            textTransform: 'none',
            color: 'text.secondary',
            px: 2.5,
            py: 0,
            whiteSpace: 'nowrap',
            '&.Mui-selected': { color: 'text.primary', fontWeight: 600 },
          }}
        />
      ))}
    </Tabs>
  )
}
