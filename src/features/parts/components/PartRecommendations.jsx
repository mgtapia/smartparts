'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import InfoNote from '@components/common/InfoNote'
import ListTable from '@components/common/ListTable'
import MoneyValue from '@components/common/MoneyValue'
import { PART_TYPE } from '@constants/enums'
import { formatBp } from '@libs/percent'
import { supplierLabel } from '@features/quotes/constants'
import { usePartCosts } from '@features/costing/hooks/usePartCosts'
import { COST_MODES, SELECTIONS, buildRecommendations } from '@features/costing/partCostsModel'

const SELECTION_LABEL = { [SELECTIONS.OEM]: 'Solo OEM', [SELECTIONS.CHEAPEST]: 'Mejor costo' }
const MODE_LABEL = { [COST_MODES.AIR]: 'Avión', [COST_MODES.SEA]: 'Barco' }
const QUALITY_LABEL = { [PART_TYPE.ORIGINAL]: 'OEM', [PART_TYPE.ALTERNATIVE]: 'AFM' }
const WORTH_COLOR = { true: 'success.main', false: 'error.main' }

const NOTES = [
  'Costo puesto en Chile de la mejor oferta, sin IVA y sin los gastos que se cobran por embarque completo, que dependen de qué más se compre en el mismo envío. Barco es marítimo LCL.',
  'Solo OEM considera únicamente la pieza original; Mejor costo, la oferta más barata sea cual sea su calidad.',
  'Conviene si el costo no supera el precio de referencia, lo que el cliente paga hoy por el repuesto.',
  'Son estimaciones con tarifas de referencia y pesos sin confirmar, no cotizaciones de un forwarder.',
]

const clp = (amount) => ({ amount, currency: 'CLP', scale: 0 })

/** Pestaña Recomendaciones de la ficha: qué conviene comprar y por qué vía, con solo OEM o con lo más barato. */
export default function PartRecommendations({ part }) {
  const { costs, suppliers, toClp } = usePartCosts()

  if (!costs) {
    return (
      <Typography variant="body2" color="text.secondary">
        Calculando costos…
      </Typography>
    )
  }

  const baselineClp = part.baselinePrice?.amount ?? null
  const { options, pick } = buildRecommendations(costs, part.id, baselineClp, toClp)
  const withCost = options.filter((o) => o.costClp != null)
  const supplierOf = (o) => {
    const s = suppliers.find((x) => x.id === o.best.supplierId)
    return supplierLabel(s, o.best.supplierId)
  }

  let verdict
  if (pick) {
    verdict = {
      color: 'success.main',
      text: `Conviene importar: ${SELECTION_LABEL[pick.selection].toLowerCase()} por ${MODE_LABEL[pick.mode].toLowerCase()} con ${supplierOf(pick)}, a ${formatBp(Math.abs(pick.diffBp))} bajo el precio de referencia.`,
    }
  } else if (withCost.length > 0) {
    const cheapest = withCost.reduce((a, b) => (b.costClp < a.costClp ? b : a))
    verdict = {
      color: 'error.main',
      text: `No conviene importar: el menor costo puesto en Chile (${MODE_LABEL[cheapest.mode].toLowerCase()}, ${SELECTION_LABEL[cheapest.selection].toLowerCase()}) supera en ${formatBp(cheapest.diffBp)} el precio de referencia.`,
    }
  } else {
    verdict = {
      color: 'text.secondary',
      text: 'Sin costo calculable: falta una cotización costeable, o el peso y el volumen del repuesto.',
    }
  }

  const columns = [
    { id: 'selection', label: 'Selección', render: (o) => SELECTION_LABEL[o.selection] },
    { id: 'mode', label: 'Envío', width: 90, render: (o) => MODE_LABEL[o.mode] },
    {
      id: 'supplier',
      label: 'Proveedor',
      width: 200,
      render: (o) => (o.best ? supplierOf(o) : '—'),
    },
    {
      id: 'quality',
      label: 'Calidad',
      width: 80,
      render: (o) => (o.best ? QUALITY_LABEL[o.best.quality] : '—'),
    },
    {
      id: 'cost',
      label: 'Costo en Chile',
      width: 130,
      align: 'right',
      render: (o) => (o.costClp == null ? '—' : <MoneyValue money={clp(o.costClp)} />),
    },
    {
      id: 'diff',
      label: 'Sobre referencia',
      width: 130,
      align: 'right',
      render: (o) =>
        o.diffBp == null ? (
          '—'
        ) : (
          <Box component="span" sx={{ color: WORTH_COLOR[o.worthIt] }}>
            {`${o.diffBp > 0 ? '+' : o.diffBp < 0 ? '−' : ''}${formatBp(Math.abs(o.diffBp))}`}
          </Box>
        ),
    },
    {
      id: 'worth',
      label: 'Conviene',
      width: 90,
      render: (o) =>
        o.worthIt == null ? (
          '—'
        ) : (
          <Box component="span" sx={{ color: WORTH_COLOR[o.worthIt] }}>
            {o.worthIt ? 'Sí' : 'No'}
          </Box>
        ),
    },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body1" sx={{ flex: 1, color: verdict.color }}>
          {verdict.text}
        </Typography>
        <InfoNote title="Cómo se calcula" paragraphs={NOTES} />
      </Card>
      <ListTable
        columns={columns}
        rows={options}
        getRowKey={(o) => `${o.selection}-${o.mode}`}
        emptyText="Sin opciones."
      />
    </Box>
  )
}
