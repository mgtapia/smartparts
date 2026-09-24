'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { RADIUS } from '@constants/colors'

/**
 * Caja de 44px, Select chico — el patrón de "control de barra superior" que
 * se repite en cualquier toolbar de la app (catálogo, y lo que venga después
 * en suppliers/quotes). Misma forma de píldora, mismo ícono de flecha y
 * mismo estado "abierto" (borde punteado) que `FilterChip`, para que ambos
 * controles de dropdown de la barra se vean como una sola familia. `label`
 * no se muestra como texto — solo identifica el control al pasar el mouse.
 */
export default function ToolbarSelectBox({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false)

  return (
    // `key` fuerza a remontar el Tooltip al abrir/cerrar el Select — evita que
    // quede "pegado" visible por un estado de hover que MUI no llegó a limpiar
    // solo (el Select abre un Popper propio, que puede comerse el mouseleave).
    <Tooltip key={open ? 'open' : 'closed'} title={label} open={open ? false : undefined}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          border: '1px solid',
          borderStyle: open ? 'dashed' : 'solid',
          borderColor: open ? 'primary.main' : 'divider',
          borderRadius: `${RADIUS.pill}px`,
          px: 1.5,
          height: 44,
        }}
      >
        <Select
          size="small"
          variant="standard"
          disableUnderline
          value={value}
          onChange={(e) => onChange(e.target.value)}
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          IconComponent={(props) => (
            <KeyboardArrowDownIcon
              {...props}
              fontSize="small"
              sx={{
                ...props.sx,
                transition: 'transform 0.15s',
                transform: open ? 'rotate(180deg)' : 'none',
              }}
            />
          )}
          sx={{
            minWidth: 72,
            '& .MuiSelect-select': {
              display: 'flex',
              alignItems: 'center',
              lineHeight: 1,
              py: 0,
            },
          }}
        >
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Tooltip>
  )
}
