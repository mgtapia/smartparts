'use client'

import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import UncertainValue from '@components/common/UncertainValue'
import { MoneyFromMicros } from '@components/common/MoneyValue'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { GRID_GAP } from '@constants/layout'
import { formatBp } from '@libs/percent'
import { useOrders } from '@features/orders/hooks/useOrders'
import { useClientOrderSimulation } from '@features/orders/hooks/useClientOrderSimulation'
import { isActiveClientOrder } from '@features/orders/ordersModel'
import { orderLabel } from '@features/orders/constants'

const COST_REASON =
  'Costo final en Chile estimado con parámetros y supuestos sin confirmar; se confirma con un pedido de prueba'
const SALE_REASON =
  'Precio de venta acordado en la OC del cliente, llevado a USD con el tipo de cambio de referencia, sin confirmar'

function Savings({ row, purchaseOrders }) {
  const { order, client } = row
  const sim = useClientOrderSimulation(order, purchaseOrders)
  const { scenario } = sim
  if (sim.loading || sim.error || !scenario) return null

  const sale = sim.saleFor(scenario)
  const cost = scenario.cost.totals.landedNet
  const margin = sale?.margin ?? null

  return (
    <Card sx={{ p: 2, mb: `${GRID_GAP}px` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {orderLabel(order)}
          {client ? ` · ${client.name}` : ''} · escenario más barato
        </Typography>
        <Typography
          variant="body2"
          component={Link}
          href={`/client-orders/${order.id}`}
          color="text.secondary"
          sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          Abrir simulación
        </Typography>
      </Box>
      <InfoGrid columns={4}>
        <InfoField label="Escenario">{scenario.label}</InfoField>
        <InfoField label="Costo final">
          <UncertainValue verified={false} reason={COST_REASON}>
            <MoneyFromMicros micros={cost} currency="USD" />
          </UncertainValue>
        </InfoField>
        <InfoField label="Venta">
          {sale?.saleMicro ? (
            <UncertainValue verified={false} reason={SALE_REASON}>
              <MoneyFromMicros micros={sale.saleMicro} currency="USD" />
            </UncertainValue>
          ) : (
            'Sin datos'
          )}
        </InfoField>
        <InfoField label="Margen">
          {margin?.marginBp != null ? (
            <UncertainValue verified={false} reason={`${COST_REASON}. ${SALE_REASON}`}>
              {formatBp(margin.marginBp)}
            </UncertainValue>
          ) : (
            'Sin datos'
          )}
        </InfoField>
      </InfoGrid>
    </Card>
  )
}

/**
 * Costo del escenario más barato para la OC de cliente vigente más reciente.
 * Se monta aparte: la simulación completa tarda cerca de 0,6 s y no debe
 * retrasar el resto de la Vista general.
 */
export default function ClientOrderSavings() {
  const { loading, clientOrderRows, purchaseOrders } = useOrders()
  if (loading) return null
  const row = clientOrderRows.find((r) => isActiveClientOrder(r.order) && r.order.lines.length > 0)
  if (!row) return null
  return <Savings row={row} purchaseOrders={purchaseOrders} />
}
