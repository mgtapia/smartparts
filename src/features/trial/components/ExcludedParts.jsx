'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import ListTable from '@components/common/ListTable'
import UncertainValue from '@components/common/UncertainValue'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { formatBp } from '@libs/percent'
import { summarizeExcluded } from '../airTrialModel'
import { RED_REASON, formatClp, formatClpMillions } from '../constants'

const red = (children) => (
  <UncertainValue verified={false} reason={RED_REASON}>
    {children}
  </UncertainValue>
)
const dash = (value, format) => (value == null ? '—' : format(value))

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
    sortValue: (r) => r.reasons.join('; '),
    width: 280,
    render: (r) => r.reasons.join('; '),
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
    label: 'Costo en Chile',
    sortValue: (r) => r.costClp,
    width: 120,
    align: 'right',
    render: (r) => dash(r.costClp, (v) => red(formatClp(v))),
  },
  {
    id: 'baseline',
    label: 'Cliente hoy',
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
            {summary.price.count}
            {summary.price.count ? (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                {red(formatClpMillions(summary.price.extraClp))} de sobrecosto
                {summary.price.medianBp != null
                  ? `, típico +${formatBp(summary.price.medianBp)}`
                  : ''}
              </Typography>
            ) : null}
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
