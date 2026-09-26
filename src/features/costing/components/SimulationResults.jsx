'use client'

import { useState } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import ListTable from '@components/common/ListTable'
import UncertainValue from '@components/common/UncertainValue'
import { MoneyFromMicros } from '@components/common/MoneyValue'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { RADIUS } from '@constants/colors'
import { PART_TYPE } from '@constants/enums'
import { formatBp } from '@libs/percent'
import { supplierLabel } from '@features/quotes/constants'
import { isFclMode } from '@core/costing/containers'
import { cheapestScenario } from '../orderSimulationModel'

const QUALITY_TAG = { [PART_TYPE.ORIGINAL]: 'OEM', [PART_TYPE.ALTERNATIVE]: 'AFM' }

export const ESTIMATE_REASON =
  'Estimación: tarifas y gastos de referencia, sin cotización de forwarder ni agente de aduanas'
const CONTAINERS_REASON =
  'Según el peso y el volumen de los repuestos, que en su mayoría no están confirmados, y la capacidad útil de referencia del contenedor'
export const SALE_REASON =
  'Precio de venta acordado en la OC del cliente, llevado a USD con el tipo de cambio de referencia, sin confirmar'

export const money = (micro) => <MoneyFromMicros micros={micro} currency="USD" />
export const red = (node, reason = ESTIMATE_REASON) => (
  <UncertainValue verified={false} reason={reason}>
    {node}
  </UncertainValue>
)
const pct = (num, den) =>
  den > 0 ? `${(Math.round((num * 1000) / den) / 10).toLocaleString('es-CL')} %` : '—'

export function scenarioLabel(scenario, supplierName) {
  if (scenario.label) return scenario.label
  if (scenario.kind === 'best') return 'Mejor combinación'
  if (scenario.kind === 'bestOfSize') return `Mejor con ${scenario.supplierIds.length} proveedores`
  return `Solo ${supplierName(scenario.supplierIds[0])}`
}

/** Nombre de un proveedor a partir de las cotizaciones cargadas. */
export function supplierNameFrom(lookup) {
  return (id) => {
    const quote = [...lookup.quotes.values()].find((q) => q.supplierId === id)
    return supplierLabel(quote?.supplier, id)
  }
}

/**
 * Tabla de escenarios de compra y detalle del elegido: se usa en la pestaña "Pedido completo"
 * de la Calculadora y en la simulación de una OC del cliente.
 *
 * @param {Object} props
 * @param {any} props.simulation   Resultado de `simulateOrder`.
 * @param {any} props.scenario     Escenario elegido.
 * @param {(id: string) => void} props.onSelectScenario
 * @param {{ parts: Map<string, any>, quotes: Map<string, any> }} props.lookup
 * @param {boolean} props.isFcl
 * @param {(scenario: any) => { saleMicro: number, costMicro: number, margin: any, unpricedPartIds: string[] }} [props.sale]
 *   Con esto, en vez de "Cliente hoy" y "Ahorro" se muestran la venta acordada y el margen.
 * @param {import('react').ReactNode} [props.detailActions]  Acciones sobre el escenario elegido.
 */
export default function SimulationResults({
  simulation,
  scenario,
  onSelectScenario,
  lookup,
  isFcl,
  sale,
  detailActions,
}) {
  const supplierName = supplierNameFrom(lookup)
  // Colapsado muestra solo el escenario elegido; abierto, todos para cambiar de escenario.
  const [open, setOpen] = useState(false)
  const totalParts = simulation?.parts.length ?? 0
  // El formato de envío lo elige cada escenario; `isFcl` solo aplica si el escenario no lo trae.
  const isFclFor = (s) => (s.mode ? isFclMode(s.mode) : Boolean(isFcl))
  const inferredReason = simulation?.notes.inferredOffers
    ? `${ESTIMATE_REASON}. Incluye cotizaciones inferidas del lado opuesto`
    : ESTIMATE_REASON

  if (!simulation || simulation.blockers.length > 0) {
    return (
      <Card sx={{ p: 2, fontSize: 13 }}>
        {red(
          simulation?.blockers.join('; ') || 'Sin cotizaciones para simular',
          'Falta un dato para costear el pedido',
        )}
      </Card>
    )
  }

  const saleColumns = sale
    ? [
        {
          id: 'sale',
          label: 'Venta',
          width: 120,
          align: 'right',
          tooltip: 'Precio acordado en la OC del cliente por lo que el escenario cubre.',
          render: (s) => red(money(sale(s).saleMicro), SALE_REASON),
        },
        {
          id: 'margin',
          label: 'Margen',
          width: 150,
          align: 'right',
          tooltip: 'Venta menos costo final, y su porcentaje sobre la venta.',
          render: (s) => {
            const { margin } = sale(s)
            return margin
              ? red(
                  <>
                    {money(margin.marginMicros)}
                    {margin.marginBp === null ? null : ` · ${formatBp(margin.marginBp)}`}
                  </>,
                  `${inferredReason}. ${SALE_REASON}`,
                )
              : '—'
          },
        },
      ]
    : [
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

  const cheapest = cheapestScenario(simulation.scenarios)
  const scenarioColumns = [
    {
      id: 'scenario',
      label: 'Escenario',
      render: (s) => scenarioLabel(s, supplierName),
    },
    {
      id: 'suppliers',
      label: 'Proveedores',
      render: (s) => s.supplierIds.map(supplierName).join(', '),
    },
    ...(simulation.scenarios.some((s) => s.modeLabel)
      ? [
          {
            id: 'mode',
            label: 'Envío',
            width: 140,
            tooltip: 'Formato de envío más barato para este escenario.',
            render: (s) => s.modeLabel ?? '—',
          },
        ]
      : []),
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
    ...(simulation.scenarios.some(isFclFor)
      ? [
          {
            id: 'containers',
            label: 'Contenedores',
            width: 110,
            align: 'right',
            tooltip: 'Contenedores que alcanzan para el volumen y el peso del escenario.',
            render: (s) => (isFclFor(s) ? red(s.cost.containers ?? '—', CONTAINERS_REASON) : '—'),
          },
        ]
      : []),
    {
      id: 'goods',
      label: 'Mercadería',
      width: 110,
      align: 'right',
      tooltip: 'Precio de los proveedores por la cantidad pedida.',
      render: (s) => money(s.cost.totals.goods),
    },
    {
      id: 'landed',
      label: 'Costo final',
      width: 120,
      align: 'right',
      render: (s) => red(money(s.cost.totals.landedNet), inferredReason),
    },
    {
      id: 'versus',
      label: 'Sobre el más barato',
      width: 130,
      align: 'right',
      tooltip:
        'Cuánto más cuesta este escenario que el más barato entre los que cubren más repuestos.',
      render: (s) => {
        if (!cheapest) return '—'
        if (s.id === cheapest.id) return 'Más barato'
        if (s.coveredPartIds.length !== cheapest.coveredPartIds.length) return '—'
        const base = cheapest.cost.totals.landedNet
        return red(`+${pct(s.cost.totals.landedNet - base, base)}`, inferredReason)
      },
    },
    ...saleColumns,
  ]

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Box
          role="button"
          tabIndex={0}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => e.key === 'Enter' && setOpen((v) => !v)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            px: 0.5,
            mb: 0.5,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {open ? 'Elige un escenario' : 'Escenario elegido'} · {simulation.scenarios.length}{' '}
            escenarios
          </Typography>
          <KeyboardArrowDownIcon
            fontSize="small"
            sx={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </Box>
        <ListTable
          columns={scenarioColumns}
          rows={open ? simulation.scenarios : [scenario ?? simulation.scenarios[0]]}
          getRowKey={(s) => s.id}
          selectedKey={open ? scenario?.id : undefined}
          onRowClick={(s) => {
            if (open) onSelectScenario(s.id)
            setOpen((v) => !v)
          }}
        />
      </Box>
      {scenario ? (
        <ScenarioDetail
          scenario={scenario}
          isFcl={isFclFor(scenario)}
          lookup={lookup}
          supplierName={supplierName}
          reason={inferredReason}
          label={scenarioLabel(scenario, supplierName)}
          actions={detailActions}
        />
      ) : null}
    </>
  )
}

function ScenarioDetail({ scenario, isFcl, lookup, supplierName, reason, label, actions }) {
  const { totals, bySupplier, lines, containers } = scenario.cost
  const breakdown = [
    ['Mercadería', totals.goods, 'Precio de los proveedores, tramo según la cantidad'],
    [
      'Transporte en China',
      totals.inland,
      isFcl
        ? 'Por proveedor: camión por contenedor según su distancia y la parte de contenedor que ocupa'
        : 'Por proveedor: su distancia y sus toneladas',
    ],
    [
      'Exportación',
      totals.export,
      isFcl
        ? 'Por proveedor: despacho y B/L; THC, VGM y sello por contenedor'
        : 'Por proveedor: despacho, documentos y manipulación',
    ],
    [
      'Flete',
      totals.freight,
      isFcl
        ? 'Flete por contenedor × contenedores del embarque'
        : 'Sobre el total cobrable del embarque consolidado',
    ],
    ['Seguro', totals.insurance, null],
    ['Arancel', totals.duty, 'Arancel general salvo proveedor con Formulario F confirmado'],
    [
      'Gastos en Chile',
      totals.chile,
      isFcl
        ? 'THC, retiro y reparto por contenedor; B/L, handling y agente de aduanas, una vez'
        : 'Puerto o aeropuerto, reparto y agente de aduanas, una vez',
    ],
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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 1.5,
        }}
      >
        <Typography variant="subtitle1">{label}</Typography>
        {actions}
      </Box>
      <InfoGrid columns={5}>
        {breakdown.map(([name, micro, hint]) => (
          <InfoField key={name} label={name} hint={hint ?? undefined}>
            {name === 'Mercadería' ? money(micro) : red(money(micro), reason)}
          </InfoField>
        ))}
        {isFcl ? (
          <InfoField
            label="Contenedores"
            hint="Los que alcanzan para el volumen y el peso del escenario"
          >
            {red(containers ?? '—', CONTAINERS_REASON)}
          </InfoField>
        ) : null}
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
