'use client'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Pill from '@components/common/Pill'

/**
 * Qué calidades ofrece una cotización (OEM, AFM o ambas), como chips.
 * La calidad que el proveedor indicó en su cotización está confirmada; los chips van en
 * rojo si alguna línea cotizada por el proveedor no la tiene confirmada. Las líneas inferidas
 * del lado opuesto no cuentan aquí: ya se marcan en rojo en el detalle.
 */
export default function QualityChips({ quotation }) {
  const chip = (label) =>
    quotation.partTypeConfirmed ? (
      <Pill label={label} tone="neutral" />
    ) : (
      <Tooltip title="Calidad sin confirmar en alguna línea cotizada por el proveedor">
        <span>
          <Pill label={label} tone="error" />
        </span>
      </Tooltip>
    )
  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
      {quotation.originalCount > 0 ? chip('OEM') : null}
      {quotation.alternativeCount > 0 ? chip('AFM') : null}
    </Box>
  )
}
