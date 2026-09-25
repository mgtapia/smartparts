'use client'

import Box from '@mui/material/Box'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import InfoNote from '@components/common/InfoNote'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { isFclMode } from '@core/costing/containers'
import CostParametersDialog from '@features/quotes/components/CostParametersDialog'
import { MODE_OPTIONS } from '@features/quotes/constants'
import { vehicleLabel } from '@features/vehicles/constants'
import { QUALITY, QUANTITY_SOURCE } from '../orderSimulationModel'
import { useOrderSimulation } from '../hooks/useOrderSimulation'
import SimulationResults from './SimulationResults'

export const QUALITY_OPTIONS = [
  { value: QUALITY.ANY, label: 'Cualquier calidad' },
  { value: QUALITY.OEM, label: 'Solo OEM' },
  { value: QUALITY.AFM, label: 'Solo AFM' },
]
const QUANTITY_OPTIONS = [
  { value: QUANTITY_SOURCE.CLIENT_ESTIMATE, label: 'Cantidad estimada del cliente' },
  { value: QUANTITY_SOURCE.ONE_EACH, label: 'Una de cada repuesto' },
]

export const ORDER_HELP = [
  'Simula un pedido del cliente: todos los repuestos cotizados del vehículo, con la cantidad que estimó el cliente en su planilla, y cómo se compraría a los proveedores.',
  'Mejor combinación: prueba todas las combinaciones de proveedores. En cada una, cada repuesto va al proveedor con menor costo final; después se costea el pedido completo. Gana la que cubre más repuestos y, a igual cobertura, la más barata.',
  'Cada proveedor que se suma agrega sus propios gastos: transporte en China, despacho de exportación y transferencia bancaria. Flete, seguro, gastos en Chile y agente de aduanas se pagan una vez por el embarque consolidado.',
  "Contenedor completo, FCL 20' o 40' HC: el embarque son los contenedores que alcanzan para el volumen y el peso del pedido, redondeando hacia arriba. Flete, THC, retiro y reparto se pagan por contenedor; el camión en China, por proveedor según la parte de contenedor que ocupa lo que despacha.",
  'Cliente hoy: lo que paga hoy el cliente por los mismos repuestos, precio neto de su planilla llevado a USD con el tipo de cambio de referencia. Ahorro: esa cifra menos el costo final, antes del margen.',
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
          label="Calidad"
          value={sim.quality}
          onChange={sim.setQuality}
          options={QUALITY_OPTIONS}
        />
        <ToolbarSelectBox
          label="Cantidades"
          value={sim.quantitySource}
          onChange={sim.setQuantitySource}
          options={QUANTITY_OPTIONS}
        />
        <ToolbarSelectBox
          label="Modo de transporte"
          value={assumptions.mode}
          onChange={assumptions.setMode}
          options={MODE_OPTIONS}
        />
        <CostParametersDialog
          mode={assumptions.mode}
          setMode={assumptions.setMode}
          rates={assumptions.rates}
          setRates={assumptions.setRates}
        />
        <InfoNote paragraphs={ORDER_HELP} />
      </Box>

      <SimulationResults
        simulation={simulation}
        scenario={scenario}
        onSelectScenario={sim.setScenarioId}
        lookup={lookup}
        isFcl={isFclMode(assumptions.mode)}
      />
    </ContentWidth>
  )
}
