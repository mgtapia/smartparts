'use client'

import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import InfoNote from '@components/common/InfoNote'

/**
 * Tarjeta de un gráfico del dashboard: título a 13 px como el resto del
 * catálogo, nota opcional a demanda y un texto cuando no hay datos que graficar.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string[]} [props.note]   Párrafos de ayuda; se abren desde el ícono.
 * @param {boolean} [props.empty]
 * @param {string} [props.emptyText]
 */
export default function ChartCard({
  title,
  note,
  empty = false,
  emptyText = 'Sin datos para graficar.',
  children,
}) {
  return (
    <Card sx={{ p: 2, minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}
      >
        {title}
        {note ? <InfoNote dense title={title} paragraphs={note} /> : null}
      </Typography>
      {empty ? (
        <Typography color="text.secondary" sx={{ fontSize: 13, py: 4, textAlign: 'center' }}>
          {emptyText}
        </Typography>
      ) : (
        children
      )}
    </Card>
  )
}
