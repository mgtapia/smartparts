'use client'

import Box from '@mui/material/Box'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import InfoNote from '@components/common/InfoNote'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import QuantitiesEditor from './QuantitiesEditor'
import CustomScenarioEditor from './CustomScenarioEditor'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import CostParametersDialog from '@features/quotes/components/CostParametersDialog'
import { vehicleLabel } from '@features/vehicles/constants'
import { QUANTITY_SOURCE } from '../orderSimulationModel'
import { useOrderSimulation } from '../hooks/useOrderSimulation'
import SimulationResults from './SimulationResults'

const QUANTITY_OPTIONS = [
  { value: QUANTITY_SOURCE.CLIENT_ESTIMATE, label: 'Cantidad estimada del cliente' },
  { value: QUANTITY_SOURCE.ONE_EACH, label: 'Una de cada repuesto' },
]

export const ORDER_HELP = [
  'Simula un pedido del cliente: todos los repuestos cotizados del vehículo, con la cantidad que estimó el cliente en su planilla, y cuánto cuesta comprarlo según lo que se decida.',
  'Cada escenario combina dos decisiones. Qué se compra: solo originales (OEM), o lo más económico de cualquier calidad. Cómo se envía: marítimo o aéreo. En marítimo se elige solo el formato más barato entre carga consolidada y contenedor completo.',
  'Dentro de cada escenario se busca sola la mejor combinación de proveedores: cada repuesto va al de menor costo final y se suma lo que cuesta trabajar con cada proveedor extra (transporte en China, despacho de exportación y transferencia). Flete, seguro, gastos en Chile y agente de aduanas se pagan una vez por embarque.',
  'Escenario personalizado: eliges qué se compra, cómo se envía y qué proveedores incluir; aparece como una fila más de la tabla.',
  'Sobre el más barato: cuánto más cuesta cada escenario que el más barato entre los que cubren más repuestos. Cliente hoy: lo que paga hoy el cliente por los mismos repuestos, precio neto de su planilla llevado a USD con el tipo de cambio de referencia. Ahorro: esa cifra menos el costo final, antes del margen.',
]

export default function OrderSimulation({ tabs }) {
  const sim = useOrderSimulation()
  const { simulation, scenario, lookup, assumptions } = sim

  if (sim.loading) {
    return (
      <ContentWidth>
        <DetailPageSkeleton rows={8} />
      </ContentWidth>
    )
  }
  if (sim.error) {
    return (
      <ContentWidth>
        <ErrorState />
      </ContentWidth>
    )
  }

  const totalParts = simulation?.parts.length ?? 0

  return (
    <ContentWidth>
      <PageHeader
        title="Calculadora"
        meta={
          simulation
            ? `${totalParts} repuestos · ${simulation.units.toLocaleString('es-CL')} unidades.`
            : undefined
        }
      />
      {tabs}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1.5 }}>
        <ToolbarSelectBox
          label="Vehículo"
          value={sim.vehicleId ?? ''}
          onChange={sim.setVehicleId}
          options={sim.vehicles.map((v) => ({ value: v.id, label: vehicleLabel(v.vehicle) }))}
        />
        <ToolbarSelectBox
          label="Cantidades"
          value={sim.quantitySource}
          onChange={sim.setQuantitySource}
          options={QUANTITY_OPTIONS}
        />
        <CostParametersDialog
          mode={assumptions.mode}
          setMode={assumptions.setMode}
          rates={assumptions.rates}
          setRates={assumptions.setRates}
        />
        <InfoNote paragraphs={ORDER_HELP} />
      </Box>

      <QuantitiesEditor
        rows={sim.quantityRows}
        onChange={sim.setQuantity}
        onReset={sim.resetQuantities}
      />

      <CustomScenarioEditor
        custom={sim.custom}
        onChange={sim.setCustom}
        suppliers={sim.supplierOptions}
      />

      <SimulationResults
        simulation={simulation}
        scenario={scenario}
        onSelectScenario={sim.setScenarioId}
        lookup={lookup}
      />
    </ContentWidth>
  )
}
