'use client'

import { useState } from 'react'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import FormGroup from '@mui/material/FormGroup'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import FilterPopover from '@components/common/FilterPopover'
import CheckboxRow from '@components/common/CheckboxRow'
import { CATALOG_COLUMNS } from '../constants'

// Mismo popover que el resto de los filtros (FilterPanel/FilterChip) — el
// trigger sigue siendo un ícono (no una pastilla con label), pero el
// contenido adentro (checks, texto, espaciado) es exactamente el mismo.
export default function ColumnsMenu({ hiddenColumns, onToggle }) {
  const [anchorEl, setAnchorEl] = useState(null)

  return (
    <>
      <Tooltip title="Columnas">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ height: 44, width: 44 }}
        >
          <ViewColumnIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <FilterPopover anchorEl={anchorEl} onClose={() => setAnchorEl(null)}>
        <FormGroup sx={{ gap: 0.5 }}>
          {CATALOG_COLUMNS.map((col) => (
            <CheckboxRow
              key={col.id}
              checked={!hiddenColumns.has(col.id)}
              onChange={() => onToggle(col.id)}
              label={col.label}
            />
          ))}
        </FormGroup>
      </FilterPopover>
    </>
  )
}
