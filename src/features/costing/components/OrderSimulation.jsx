'use client'

import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import InfoNote from '@components/common/InfoNote'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import UncertainValue from '@components/common/UncertainValue'
import { MoneyFromMicros } from '@components/common/MoneyValue'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { RADIUS } from '@constants/colors'
import { PART_TYPE } from '@constants/enums'
import CostParametersDialog from '@features/quotes/components/CostParametersDialog'
import { MODE_OPTIONS, supplierLabel } from '@features/quotes/constants'
import { vehicleLabel } from '@features/vehicles/constants'
import { QUALITY, QUANTITY_SOURCE } from '../orderSimulationModel'
import { useOrderSimulation } from '../hooks/useOrderSimulation'

const QUALITY_OPTIONS = [
  { value: QUALITY.ANY, label: 'Cualquier calidad' },
  { value: QUALITY.OEM, label: 'Solo OEM' },
  { value: QUALITY.AFM, label: 'Solo AFM' },
]
const QUANTITY_OPTIONS = [
  { value: QUANTITY_SOURCE.CLIENT_ESTIMATE, label: 'Cantidad estimada del cliente' },
  { value: QUANTITY_SOURCE.ONE_EACH, label: 'Una de cada repuesto' },
]
const QUALITY_TAG = { [PART_TYPE.ORIGINAL]: 'OEM', [PART_TYPE.ALTERNATIVE]: 'AFM' }

const ORDER_HELP = [
  'Simula un pedido del cliente: todos los repuestos cotizados del vehículo, con la cantidad que estimó el cliente en su planilla, y cómo se compraría a los proveedores.',
  'Mejor combinación: prueba todas las combinaciones de proveedores. En cada una, cada repuesto va al proveedor con menor costo final; después se costea el pedido completo. Gana la que cubre más repuestos y, a igual cobertura, la más barata.',
  'Cada proveedor que se suma agrega sus propios gastos: transporte en China, despacho de exportación y transferencia bancaria. Flete, seguro, gastos en Chile y agente de aduanas se pagan una vez por el embarque consolidado.',
  'Cliente hoy: lo que paga hoy el cliente por los mismos repuestos, precio neto de su planilla llevado a USD con el tipo de cambio de referencia. Ahorro: esa cifra menos el costo final, antes del margen.',
]

const ESTIMATE_REASON =
  'Estimación: tarifas y gastos de referencia, sin cotización de forwarder ni agente de aduanas'

const money = (micro) => <MoneyFromMicros micros={micro} currency="USD" />
const red = (node, reason = ESTIMATE_REASON) => (
  <UncertainValue verified={false} reason={reason}>
    {node}
  </UncertainValue>
)
const pct = (num, den) =>
  den > 0 ? `${(Math.round((num * 1000) / den) / 10).toLocaleString('es-CL')} %` : '—'

function scenarioLabel(scenario, supplierName) {
  if (scenario.kind === 'best') return 'Mejor combinación'
  if (scenario.kind === 'bestOfSize') return `Mejor con ${scenario.supplierIds.length} proveedores`
  return `Solo ${supplierName(scenario.supplierIds[0])}`
}

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

  const supplierName = (id) => {
    const quote = [...lookup.quotes.values()].find((q) => q.supplierId === id)
    return supplierLabel(quote?.supplier, id)
  }
  const totalParts = simulation?.parts.length ?? 0
  const inferredReason = simulation?.notes.inferredOffers
    ? `${ESTIMATE_REASON}. Incluye cotizaciones inferidas del lado opuesto`
    : ESTIMATE_REASON

  const scenarioColumns = [
    {
      id: 'scenario',
      label: 'Escenario',
      render: (s) => (
        <Box
          component="button"
          type="button"
          onClick={() => sim.setScenarioId(s.id)}
          sx={{
            all: 'unset',
            cursor: 'pointer',
            px: 1,
            borderRadius: `${RADIUS.inputSmall}px`,
            bgcolor: scenario?.id === s.id ? 'action.selected' : undefined,
          }}
        >
          {scenarioLabel(s, supplierName)}
        </Box>
      ),
    },
    {
      id: 'suppliers',
      label: 'Proveedores',
      render: (s) => s.supplierIds.map(supplierName).join(', '),
    },
    {
      id: 'coverage',
      label: 'Repuestos',
      width: 90,
      align: 'right',
      tooltip: 'Repuestos del pedido que cubre el escenario.',
      render: (s) =>
        s.missingPartIds.length > 0
          ? red(
              `${s.coveredPartIds.length} de ${totalParts}`,
              `${s.missingPartIds.length} repuestos sin oferta en este escenario`,
            )
          : `${s.coveredPartIds.length} de ${totalParts}`,
    },
    {
      id: 'goods',
      label: 'Mercadería',
      width: 110,
      align: 'right',
      tooltip: 'Precio de los proveedores por la cantidad pedida.',
      render: (s) => money(s.cost.totals.goods),
    },
    {
      id: 'extra',
      label: 'Gastos',
      width: 110,
      align: 'right',
      tooltip: 'Todo lo que se suma a la mercadería hasta la bodega en Chile, sin IVA.',
      render: (s) => red(money(s.cost.totals.landedNet - s.cost.totals.goods), inferredReason),
    },
    {
      id: 'landed',
      label: 'Costo final',
      width: 120,
      align: 'right',
      render: (s) => red(money(s.cost.totals.landedNet), inferredReason),
    },
    {
      id: 'baseline',
      label: 'Cliente hoy',
      width: 120,
      align: 'right',
      tooltip: 'Lo que paga hoy el cliente por los mismos repuestos.',
      render: (s) =>
        red(
          money(s.baselineMicro),
          'Precio neto de la planilla del cliente, llevado a USD con el tipo de cambio de referencia',
        ),
    },
    {
      id: 'savings',
      label: 'Ahorro',
      width: 90,
      align: 'right',
      tooltip: 'Cliente hoy menos costo final, antes del margen.',
      render: (s) =>
        red(pct(s.baselineMicro - s.cost.totals.landedNet, s.baselineMicro), inferredReason),
    },
  ]

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

      {!simulation || simulation.blockers.length > 0 ? (
        <Card sx={{ p: 2, fontSize: 13 }}>
          {red(
            simulation?.blockers.join('; ') || 'Sin cotizaciones para simular',
            'Falta un dato para costear el pedido',
          )}
        </Card>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            <ListTable
              columns={scenarioColumns}
              rows={simulation.scenarios}
              getRowKey={(s) => s.id}
            />
          </Box>
          {scenario ? (
            <ScenarioDetail
              scenario={scenario}
              lookup={lookup}
              supplierName={supplierName}
              reason={inferredReason}
              label={scenarioLabel(scenario, supplierName)}
            />
          ) : null}
        </>
      )}
    </ContentWidth>
  )
}

function ScenarioDetail({ scenario, lookup, supplierName, reason, label }) {
  const { totals, bySupplier, lines } = scenario.cost
  const breakdown = [
    ['Mercadería', totals.goods, 'Precio de los proveedores, tramo según la cantidad'],
    ['Transporte en China', totals.inland, 'Por proveedor: su distancia y sus toneladas'],
    ['Exportación', totals.export, 'Por proveedor: despacho, documentos y manipulación'],
    ['Flete', totals.freight, 'Sobre el total cobrable del embarque consolidado'],
    ['Seguro', totals.insurance, null],
    ['Arancel', totals.duty, 'Arancel general salvo proveedor con Formulario F confirmado'],
    ['Gastos en Chile', totals.chile, 'Puerto o aeropuerto, reparto y agente de aduanas, una vez'],
    ['Banco', totals.bank, 'Una transferencia por proveedor'],
    ['Costo final', totals.landedNet, 'Sin IVA'],
    ['IVA recuperable', totals.vat, 'Sale de caja en el despacho y se recupera como crédito'],
  ]

  const supplierColumns = [
    { id: 'supplier', label: 'Proveedor', render: (s) => supplierName(s.supplierId) },
    { id: 'parts', label: 'Repuestos', width: 90, align: 'right', render: (s) => s.parts },
    {
      id: 'units',
      label: 'Unidades',
      width: 90,
      align: 'right',
      render: (s) => s.units.toLocaleString('es-CL'),
    },
    { id: 'goods', label: 'Mercadería', width: 120, align: 'right', render: (s) => money(s.goods) },
    {
      id: 'inland',
      label: 'Transporte China',
      width: 130,
      align: 'right',
      render: (s) => red(money(s.inland), reason),
    },
    {
      id: 'export',
      label: 'Exportación',
      width: 110,
      align: 'right',
      render: (s) => red(money(s.export), reason),
    },
    {
      id: 'bank',
      label: 'Banco',
      width: 90,
      align: 'right',
      render: (s) => red(money(s.bank), reason),
    },
  ]

  const missing = scenario.missingPartIds.map((partId) => ({ partId, missing: true }))
  const partRows = [...lines, ...missing].sort((a, b) =>
    (lookup.parts.get(a.partId)?.nameEs ?? '').localeCompare(
      lookup.parts.get(b.partId)?.nameEs ?? '',
      'es',
    ),
  )
  const partColumns = [
    {
      id: 'part',
      label: 'Repuesto',
      render: (r) => {
        const part = lookup.parts.get(r.partId)
        return (
          <Link href={`/parts/${r.partId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
            {part?.nameEs ?? r.partId}
          </Link>
        )
      },
    },
    {
      id: 'qty',
      label: 'Cantidad',
      width: 80,
      align: 'right',
      render: (r) => (r.missing ? '—' : r.qty.toLocaleString('es-CL')),
    },
    {
      id: 'supplier',
      label: 'Proveedor',
      width: 150,
      render: (r) =>
        r.missing
          ? red('Sin oferta', 'Ningún proveedor del escenario cotizó este repuesto')
          : supplierName(r.supplierId),
    },
    {
      id: 'quality',
      label: 'Calidad',
      width: 70,
      render: (r) => {
        if (r.missing) return '—'
        const quote = lookup.quotes.get(r.offerId)
        return (
          <UncertainValue
            verified={Boolean(quote?.partTypeConfirmed)}
            reason={quote?.partTypeNote ?? 'Calidad sin confirmar'}
          >
            {QUALITY_TAG[quote?.partType] ?? '—'}
          </UncertainValue>
        )
      },
    },
    {
      id: 'unit',
      label: 'Costo unitario',
      width: 110,
      align: 'right',
      render: (r) => (r.missing ? '—' : red(money(r.unitLandedNet), reason)),
    },
    {
      id: 'total',
      label: 'Costo total',
      width: 120,
      align: 'right',
      render: (r) => (r.missing ? '—' : red(money(r.landedNet), reason)),
    },
  ]

  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
        {label}
      </Typography>
      <InfoGrid columns={5}>
        {breakdown.map(([name, micro, hint]) => (
          <InfoField key={name} label={name} hint={hint ?? undefined}>
            {name === 'Mercadería' ? money(micro) : red(money(micro), reason)}
          </InfoField>
        ))}
      </InfoGrid>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 2.5, mb: 1 }}
      >
        Por proveedor
      </Typography>
      <ListTable columns={supplierColumns} rows={bySupplier} getRowKey={(s) => s.supplierId} />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 2.5, mb: 1 }}
      >
        Por repuesto
      </Typography>
      <ListTable
        columns={partColumns}
        rows={partRows}
        getRowKey={(r) => `${r.partId}-${r.offerId ?? 'missing'}`}
      />
    </Card>
  )
}
