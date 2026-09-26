'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import InfoNote from '@components/common/InfoNote'
import UncertainValue from '@components/common/UncertainValue'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { TIERS } from '@features/costing/pricingModel'
import {
  OPTION_LABELS_ES,
  RED_REASON,
  formatClp,
  formatClpMillions,
  formatUsdMicro,
} from '../constants'

const red = (children) => (
  <UncertainValue verified={false} reason={RED_REASON}>
    {children}
  </UncertainValue>
)

/**
 * Plan de una opción del cliente: el proveedor recomendado y lo que cuesta, cuánto se le cobra y
 * cuánto ahorra frente a lo que paga hoy. Todo importe es estimado, por eso va en rojo.
 */
export default function PlanCard({ option, data }) {
  const plan = data.scenarios[0].results[option].B
  const best = plan.single[0]
  const supplier = data.suppliers.find((s) => s.id === best.supplierIds[0])
  const price = best.saleClp
  const saving = best.savingClp
  const profit = best.profitClp
  const abbrs = (ids) => ids.map((id) => data.suppliers.find((s) => s.id === id).abbr).join(' + ')
  const gainPair = plan.pair ? plan.pair.surplusClp - best.surplusClp : 0

  const notes = [
    `Un solo proveedor por opción: cada proveedor extra agrega despacho, guía aérea y reparto, y otra guía que coordinar.${plan.pair ? ` La mejor pareja, ${abbrs(plan.pair.supplierIds)}, agregaría ${formatClpMillions(gainPair)}.` : ''}`,
    `Se compran ${best.covered} de los ${plan.parts} repuestos que se ofrecen: los que compiten con el margen mínimo y el ahorro máximo de Ajustes.`,
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
        <InfoField label="Unidades">{best.units.toLocaleString('es-CL')}</InfoField>
        <InfoField
          label="Peso cobrable"
          hint="El mayor entre el peso real y el volumétrico. Entre paréntesis, el volumen de los bultos."
        >
          {best.kg.toLocaleString('es-CL')} kg (
          {(best.volumeCm3 / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 })} m³)
        </InfoField>
      </InfoGrid>
      <Box sx={{ mt: 2 }}>
        <InfoGrid columns={3}>
          <InfoField
            label="Compra al proveedor"
            hint="FOB: el precio del proveedor más el transporte en China y los gastos de exportación."
          >
            {red(formatUsdMicro(best.fobUsdMicro))}
          </InfoField>
          <InfoField label="Flete aéreo" hint="Kg cobrables por la tarifa, sin la guía aérea.">
            {red(formatUsdMicro(best.freightUsdMicro))}
          </InfoField>
          <InfoField
            label="Costo en Chile"
            hint="Con gastos por embarque, flete, arancel y agente."
          >
            {red(formatClp(best.costClp))}
          </InfoField>
        </InfoGrid>
      </Box>
      <Box sx={{ mt: 2 }}>
        <InfoGrid columns={3}>
          <InfoField label="Precio REF" hint="Lo que el cliente paga hoy por estos repuestos.">
            {formatClp(best.baselineClp)}
          </InfoField>
          <InfoField
            label="PVP neto"
            hint="Suma del precio de venta de cada repuesto: el mayor entre el precio REF menos el ahorro máximo y el costo con el margen mínimo."
          >
            {red(formatClp(price))}
          </InfoField>
          <InfoField label="Ganancia nuestra" hint="PVP neto menos el costo en Chile.">
            {red(formatClp(profit))}
          </InfoField>
        </InfoGrid>
      </Box>
      <Box sx={{ mt: 2 }}>
        <InfoGrid columns={3}>
          <InfoField
            label="Ganancia sobre el precio"
            hint="Ganancia nuestra dividida por el PVP neto."
          >
            {red(
              `${((profit / price) * 100).toLocaleString('es-CL', { maximumFractionDigits: 1 })} %`,
            )}
          </InfoField>
          <InfoField label="Ahorro del cliente">{red(formatClp(saving))}</InfoField>
          <InfoField label="Ahorro sobre lo de hoy">
            {red(`${Math.round((saving / best.baselineClp) * 100)} %`)}
          </InfoField>
        </InfoGrid>
      </Box>
      <Box sx={{ mt: 2 }}>
        <InfoGrid columns={3}>
          <InfoField
            label="Ahorro máximo"
            hint="Líneas donde el cliente ahorra el máximo permitido y el margen queda sobre el mínimo."
          >
            {best.tiers[TIERS.MAX_SAVING]} líneas
          </InfoField>
          <InfoField
            label="Ahorro parcial"
            hint="Líneas donde rige el margen mínimo y el cliente aún ahorra lo mínimo."
          >
            {best.tiers[TIERS.MIN_MARGIN]} líneas
          </InfoField>
        </InfoGrid>
      </Box>
    </Card>
  )
}
