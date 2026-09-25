'use client'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Pill from '@components/common/Pill'

/**
 * Qué calidades ofrece una cotización (OEM, AFM o ambas), como chips.
 * La calidad que el proveedor indicó en su cotización está confirmada; solo va en
 * rojo si la cotización no la confirma (por ejemplo, una inferida del lado opuesto).
 */
export default function QualityChips({ quotation }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      {quotation.originalCount > 0 ? (
        quotation.partTypeConfirmed ? (
          <Pill label="OEM" tone="neutral" />
        ) : (
          <Tooltip title="Calidad sin confirmar: alguna línea es inferida del lado opuesto">
            <span>
              <Pill label="OEM" tone="error" />
            </span>
          </Tooltip>
        )
      ) : null}
      {quotation.alternativeCount > 0 ? <Pill label="AFM" tone="neutral" /> : null}
    </Box>
  )
}
