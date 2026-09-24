'use client'

import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'

/**
 * Pestañas para cambiar entre vistas de una misma página (ej. cotizaciones /
 * matriz por repuesto). No es un filtro: cambia qué se está mirando, por eso no
 * va en la barra de herramientas sino justo bajo el título.
 *
 * @param {Object} props
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {Array<{ value: string, label: string }>} props.tabs
 */
export default function ViewTabs({ value, onChange, tabs }) {
  return (
    <Tabs value={value} onChange={(_, v) => onChange(v)} sx={{ mb: 2 }}>
      {tabs.map((t) => (
        <Tab key={t.value} value={t.value} label={t.label} sx={{ textTransform: 'none' }} />
      ))}
    </Tabs>
  )
}
