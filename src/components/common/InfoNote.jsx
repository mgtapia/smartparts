'use client'

import { useState } from 'react'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import FilterPopover from '@components/common/FilterPopover'
import { POPOVER_TEXT_WIDTH } from '@constants/layout'

/**
 * Ícono de información para la barra de herramientas: en vez de dejar texto
 * explicativo suelto en la página, se abre a demanda en un popover (mismo
 * cascarón que los filtros). Cada elemento de `paragraphs` es un párrafo.
 *
 * @param {Object} props
 * @param {string} [props.title]        Tooltip del ícono.
 * @param {string[]} props.paragraphs
 */
export default function InfoNote({ title = 'Cómo leer esta tabla', paragraphs }) {
  const [anchorEl, setAnchorEl] = useState(null)

  return (
    <>
      <Tooltip title={title}>
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{ height: 44, width: 44 }}
        >
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <FilterPopover
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        minWidth={POPOVER_TEXT_WIDTH}
      >
        <Typography variant="subtitle2">{title}</Typography>
        {paragraphs.map((text) => (
          <Typography
            key={text}
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: 13, maxWidth: POPOVER_TEXT_WIDTH }}
          >
            {text}
          </Typography>
        ))}
      </FilterPopover>
    </>
  )
}
