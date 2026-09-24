'use client'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Pill from '@components/common/Pill'

/**
 * Qué calidades ofrece una cotización (OEM, AFM o ambas), como chips.
 * OEM va en rojo: es una calidad declarada por el proveedor, sin verificar
 * (se confirma con foto o muestra). AFM es neutro.
 */
export default function QualityChips({ quotation }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      {quotation.originalCount > 0 ? (
        <Tooltip title="OEM declarado por el proveedor: se confirma con foto o muestra">
          <span>
            <Pill label="OEM" tone="error" />
          </span>
        </Tooltip>
      ) : null}
      {quotation.alternativeCount > 0 ? <Pill label="AFM" tone="neutral" /> : null}
    </Box>
  )
}
