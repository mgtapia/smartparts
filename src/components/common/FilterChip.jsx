'use client'

import { useState } from 'react'
import Button from '@mui/material/Button'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import FilterPopover from './FilterPopover'
import { RADIUS } from '@constants/colors'

/**
 * Pastilla de filtro + popover con los controles reales adentro — el patrón
 * "Filtros / Ordenar" de listados de e-commerce (referencia: Samsung.com),
 * reusable para cualquier filtro de cualquier listado de la app, no solo
 * catálogo. `activeCount` resalta la pastilla y muestra cuántos valores
 * están aplicados, sin necesitar una fila aparte de chips removibles.
 */
export default function FilterChip({ label, activeCount = 0, children, minWidth = 220 }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)

  return (
    <>
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        endIcon={
          <KeyboardArrowDownIcon
            fontSize="small"
            sx={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        }
        variant="outlined"
        sx={{
          borderRadius: `${RADIUS.input}px`,
          borderStyle: open ? 'dashed' : 'solid',
          borderWidth: 1,
          borderColor: open || activeCount > 0 ? 'primary.main' : 'divider',
          bgcolor: activeCount > 0 ? 'action.hover' : 'transparent',
          color: 'text.primary',
          fontSize: 13,
          fontWeight: 400,
          textTransform: 'none',
          px: 2.5,
          height: 44,
          whiteSpace: 'nowrap',
          '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
        }}
      >
        {label}
        {activeCount > 0 ? ` · ${activeCount}` : ''}
      </Button>
      <FilterPopover anchorEl={anchorEl} onClose={() => setAnchorEl(null)} minWidth={minWidth}>
        {children}
      </FilterPopover>
    </>
  )
}
