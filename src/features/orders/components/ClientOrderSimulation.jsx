'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import ListTable from '@components/common/ListTable'
import InfoNote from '@components/common/InfoNote'
import ToolbarButton from '@components/common/ToolbarButton'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import UncertainValue from '@components/common/UncertainValue'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import CostParametersDialog from '@features/quotes/components/CostParametersDialog'
import SimulationResults, { supplierNameFrom } from '@features/costing/components/SimulationResults'
import { useClientOrderSimulation } from '../hooks/useClientOrderSimulation'
import { partLabel } from '../constants'
import CreatePurchaseOrdersDialog from './CreatePurchaseOrdersDialog'
import CustomScenarioEditor from '@features/costing/components/CustomScenarioEditor'

const HELP = [
  'Simula la compra de lo que falta de esta OC: las unidades de cada línea que ninguna compra vigente cubre todavía. La cantidad decide el tramo de precio del proveedor.',
  'Venta: el precio acordado en la OC del cliente, llevado a USD con el tipo de cambio de referencia. Margen: esa venta menos el costo final puesto en Chile, sin IVA. Ambos van en rojo mientras no estén confirmados.',
  'Cada escenario combina qué se compra (solo originales o lo más económico) y cómo se envía (marítimo o aéreo); dentro de cada uno se busca sola la mejor combinación de proveedores.',
  'Lo ya cubierto por compras creadas no se vuelve a comprar: se muestra aparte.',
  'Las líneas que se despachan desde inventario propio no entran a la simulación.',
]

/**
 * Simulación de compra de una OC del cliente: escenarios de compra a los proveedores para lo
 * que falta cubrir, con la venta y el margen contra el precio acordado, y la creación de las
 * OC a proveedores desde el escenario elegido.
 *
 * @param {Object} props
 * @param {any} props.order            OC del cliente.
 * @param {any[]} props.purchaseOrders
 * @param {Map<string, any>} props.partsById
 * @param {() => void | Promise<void>} props.onCreated  Tras crear las OC.
 */
export default function ClientOrderSimulation({ order, purchaseOrders, partsById, onCreated }) {
  const sim = useClientOrderSimulation(order, purchaseOrders)
  const [creating, setCreating] = useState(false)
  const { simulation, scenario, lookup, assumptions, basket } = sim

  if (sim.loading) return <DetailPageSkeleton rows={6} />
  if (sim.error) return <ErrorState />

  const pending = basket.entries.reduce((s, e) => s + e.qty, 0)
  const withoutQuote = simulation?.notes.partsWithoutQuote ?? []
  const coveredColumns = [
    {
      id: 'part',
      label: 'Repuesto',
      render: (c) => partLabel(partsById.get(c.line.partId)),
    },
    {
      id: 'qty',
      label: 'Cubierto',
      width: 110,
      align: 'right',
      render: (c) => `${c.coveredQty} de ${c.line.qty} u`,
    },
  ]

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1.5 }}>
        <CostParametersDialog
          mode={assumptions.mode}
          setMode={assumptions.setMode}
          rates={assumptions.rates}
          setRates={assumptions.setRates}
        />
        <InfoNote title="Cómo se calcula" paragraphs={HELP} />
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {basket.entries.length > 0
          ? `Falta comprar ${basket.entries.length} repuestos · ${pending.toLocaleString('es-CL')} unidades.`
          : 'Todo lo que se compra ya está cubierto por compras a proveedores.'}
      </Typography>

      {withoutQuote.length > 0 ? (
        <Box sx={{ fontSize: 13, mb: 1.5 }}>
          <UncertainValue
            verified={false}
            reason="Ningún proveedor cotizó estos repuestos: no entran a ningún escenario"
          >
            {`${withoutQuote.length} repuestos sin cotización`}
          </UncertainValue>
        </Box>
      ) : null}

      <CustomScenarioEditor
        custom={sim.custom}
        onChange={sim.setCustom}
        suppliers={sim.supplierOptions}
      />

      {simulation ? (
        <SimulationResults
          simulation={simulation}
          scenario={scenario}
          onSelectScenario={sim.setScenarioId}
          lookup={lookup}
          sale={sim.saleFor}
          detailActions={
            <ToolbarButton
              label="Crear OC de compra"
              onClick={() => setCreating(true)}
              disabled={!scenario || scenario.coveredPartIds.length === 0}
            />
          }
        />
      ) : null}

      {basket.coveredLines.length > 0 ? (
        <Card sx={{ p: 2, mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Ya cubierto por compras
          </Typography>
          <ListTable
            columns={coveredColumns}
            rows={basket.coveredLines}
            getRowKey={(c) => c.line.id}
          />
        </Card>
      ) : null}

      {creating && scenario ? (
        <CreatePurchaseOrdersDialog
          scenario={scenario}
          entries={basket.entries}
          quotes={lookup.quotes}
          order={order}
          purchaseOrders={purchaseOrders}
          supplierName={supplierNameFrom(lookup)}
          onCreated={onCreated}
          onClose={() => setCreating(false)}
        />
      ) : null}
    </>
  )
}
