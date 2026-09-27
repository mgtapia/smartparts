'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ListTable from '@components/common/ListTable'
import UncertainValue from '@components/common/UncertainValue'
import Pill from '@components/common/Pill'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { formatBp } from '@libs/percent'
import { EXCLUDED_KINDS, summarizeExcluded } from '../airTrialModel'
import { RED_REASON, formatClp, formatClpMillions } from '../constants'

const red = (children) => (
  <UncertainValue verified={false} reason={RED_REASON}>
    {children}
  </UncertainValue>
)
const dash = (value, format) => (value == null ? '—' : format(value))

// Mismo motivo corto que ya usan las tres tarjetas de resumen de arriba: un Pill, no la frase
// completa repetida en cada fila (la mayoría queda fuera solo por precio).
const KIND_LABELS_ES = {
  [EXCLUDED_KINDS.PRICE]: 'Precio',
  [EXCLUDED_KINDS.SIZE]: 'Bulto',
  [EXCLUDED_KINDS.DG]: 'Peligrosa',
}
const KIND_TONES = {
  [EXCLUDED_KINDS.PRICE]: 'neutral',
  [EXCLUDED_KINDS.SIZE]: 'warning',
  [EXCLUDED_KINDS.DG]: 'error',
}

const COLUMNS = [
  {
    id: 'name',
    label: 'Repuesto',
    sortValue: (r) => r.name,
    render: (r) => (
      <>
        {r.name}
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          {r.qty.toLocaleString('es-CL')} u.
        </Typography>
      </>
    ),
  },
  {
    id: 'reasons',
    label: 'Motivo',
    sortValue: (r) => r.kinds[0],
    width: 130,
    tooltip: 'Por qué no entra en el pedido aéreo; el detalle completo va en cada etiqueta.',
    render: (r) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {r.kinds.map((k) => (
          <Tooltip key={k} title={r.reasons.join('; ')}>
            <span>
              <Pill label={KIND_LABELS_ES[k]} tone={KIND_TONES[k]} />
            </span>
          </Tooltip>
        ))}
      </Box>
    ),
  },
  {
    id: 'kg',
    label: 'Kg cobrables',
    sortValue: (r) => r.kg,
    width: 100,
    align: 'right',
    render: (r) => dash(r.kg, (v) => v.toLocaleString('es-CL')),
  },
  {
    id: 'cost',
    label: 'Costo aéreo',
    sortValue: (r) => r.costClp,
    width: 120,
    align: 'right',
    render: (r) => dash(r.costClp, (v) => red(formatClp(v))),
  },
  {
    id: 'baseline',
    label: 'Precio REF',
    sortValue: (r) => r.baselineClp,
    width: 120,
    align: 'right',
    render: (r) => dash(r.baselineClp, formatClp),
  },
  {
    id: 'diff',
    label: 'Diferencia',
    sortValue: (r) => r.diffBp,
    width: 110,
    align: 'right',
    render: (r) =>
      r.diffBp == null
        ? '—'
        : red(`${r.diffBp > 0 ? '+' : r.diffBp < 0 ? '−' : ''}${formatBp(Math.abs(r.diffBp))}`),
  },
  {
    id: 'extra',
    label: 'Sobrecosto total',
    sortValue: (r) => r.extraClp,
    width: 130,
    align: 'right',
    render: (r) => (r.extraClp ? red(formatClpMillions(r.extraClp)) : '—'),
  },
]

/**
 * Repuestos que no entran en el pedido aéreo y qué tanto más caro sale volarlos frente a lo que
 * paga hoy el cliente, para justificar la omisión. Con `limit` muestra solo los de mayor
 * sobrecosto.
 *
 * @param {Object} props
 * @param {any[]} props.logistics  `logistics` del análisis de la compra de prueba.
 * @param {number} [props.limit]
 */
export default function ExcludedParts({ logistics, limit }) {
  const summary = summarizeExcluded(logistics)
  const rows = limit ? summary.rows.slice(0, limit) : summary.rows

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Card sx={{ p: 2 }}>
        <InfoGrid columns={3}>
          <InfoField
            label="Cuestan más que el cliente hoy"
            hint="Volarlos costaría más que lo que el cliente paga hoy por las mismas cantidades."
          >
            <Box>
              <Typography component="div" sx={{ fontSize: 13 }}>
                {summary.price.count} repuestos
              </Typography>
              {summary.price.count ? (
                <Typography component="div" variant="caption" color="text.secondary">
                  {red(formatClpMillions(summary.price.extraClp))} de sobrecosto
                  {summary.price.medianBp != null
                    ? ` (típico +${formatBp(summary.price.medianBp)})`
                    : ''}
                </Typography>
              ) : null}
            </Box>
          </InfoField>
          <InfoField
            label="Bulto grande"
            hint="Un lado pasa de 150 cm y puede exigir avión de carga."
          >
            {summary.size.count}
          </InfoField>
          <InfoField
            label="Posible mercancía peligrosa"
            hint="Sin hoja MSDS ni confirmación del forwarder no van en un vuelo."
          >
            {summary.dg.count}
          </InfoField>
        </InfoGrid>
      </Card>
      <ListTable
        sortKey="excluded-parts"
        searchFields={(r) => [r.name, r.reasons.join(' ')]}
        searchPlaceholder="Buscar por repuesto o motivo…"
        columns={COLUMNS}
        rows={rows}
        getRowKey={(r) => r.partId}
        emptyText="Todos los repuestos entran en el pedido aéreo."
      />
    </Box>
  )
}
