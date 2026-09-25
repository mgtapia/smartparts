'use client'

import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'

/**
 * Lápiz y papelera al final de una fila de líneas. `deleteBlocked` deshabilita
 * borrar y explica por qué en el tooltip.
 */
export default function RowActions({ onEdit, onDelete, deleteBlocked = null }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
      <Tooltip title="Editar">
        <IconButton size="small" aria-label="Editar" onClick={onEdit}>
          <EditOutlinedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title={deleteBlocked ?? 'Borrar'}>
        <Box component="span">
          <IconButton
            size="small"
            aria-label="Borrar"
            onClick={onDelete}
            disabled={Boolean(deleteBlocked)}
          >
            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Tooltip>
    </Box>
  )
}
