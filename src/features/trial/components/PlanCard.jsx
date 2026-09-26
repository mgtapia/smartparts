'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import InfoNote from '@components/common/InfoNote'
import UncertainValue from '@components/common/UncertainValue'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { FOCUS_MARGIN_BP } from '../airTrialModel'
import { OPTION_LABELS_ES, RED_REASON, formatClp, formatClpMillions } from '../constants'

const priceWithMargin = (cost, bp) => Math.round((cost * (10000 + bp)) / 10000)

const red = (children) => (
  <UncertainValue verified={false} reason={RED_REASON}>
    {children}
  </UncertainValue>
)

/**
 * Plan de una opción del cliente: el proveedor recomendado y lo que cuesta, cuánto se le cobra y
 * cuánto ahorra frente a lo que paga hoy. Todo importe es estimado, por eso va en rojo.
 */
export default function PlanCard({ option, data, marginBp }) {
  const plan = data.scenarios[0].results[option].B
  const best = plan.single[0]
  const supplier = data.suppliers.find((s) => s.id === best.supplierIds[0])
  const price = priceWithMargin(best.costClp, marginBp)
  const saving = best.baselineClp - price
  const profit = price - best.costClp
  const abbrs = (ids) => ids.map((id) => data.suppliers.find((s) => s.id === id).abbr).join(' + ')
  const gainPair = plan.pair
    ? plan.pair.savingsClp[FOCUS_MARGIN_BP] - best.savingsClp[FOCUS_MARGIN_BP]
    : 0

  const notes = [
    `Un solo proveedor por opción: cada proveedor extra agrega despacho, guía aérea y reparto, y otra guía que coordinar.${plan.pair ? ` La mejor pareja, ${abbrs(plan.pair.supplierIds)}, agregaría ${formatClpMillions(gainPair)}.` : ''}`,
    `Se compran ${best.covered} de los ${plan.parts} repuestos que conviene volar.`,
    'Las ofertas con precio atípico no entran en la recomendación hasta que el proveedor las confirme.',
  ]

  return (
    <Card sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="overline" color="text.secondary">
          Opción {OPTION_LABELS_ES[option]}
        </Typography>
        <InfoNote title="Por qué este proveedor" paragraphs={notes} dense />
      </Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {supplier.abbr} · {supplier.name}
      </Typography>
      <InfoGrid columns={3}>
        <InfoField label="Repuestos">
          {best.covered} de {plan.parts}
        </InfoField>
        <InfoField label="Cliente hoy">{formatClp(best.baselineClp)}</InfoField>
        <InfoField label="Peso cobrable">{best.kg.toLocaleString('es-CL')} kg</InfoField>
      </InfoGrid>
      <Box sx={{ mt: 2 }}>
        <InfoGrid columns={3}>
          <InfoField
            label="Costo en Chile"
            hint="Con gastos por embarque, flete, arancel y agente."
          >
            {red(formatClp(best.costClp))}
          </InfoField>
          <InfoField label="Precio al cliente" hint="Costo en Chile más el margen elegido.">
            {red(formatClp(price))}
          </InfoField>
          <InfoField label="Ganancia nuestra" hint="Precio al cliente menos el costo en Chile.">
            {red(formatClp(profit))}
          </InfoField>
        </InfoGrid>
      </Box>
      <Box sx={{ mt: 2 }}>
        <InfoGrid columns={3}>
          <InfoField label="Ahorro del cliente">{red(formatClp(saving))}</InfoField>
          <InfoField label="Ahorro sobre lo de hoy">
            {red(`${Math.round((saving / best.baselineClp) * 100)} %`)}
          </InfoField>
        </InfoGrid>
      </Box>
    </Card>
  )
}
