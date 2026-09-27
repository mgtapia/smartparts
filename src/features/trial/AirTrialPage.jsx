'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import SectionTitle from '@components/common/SectionTitle'
import ListTable from '@components/common/ListTable'
import ViewTabs from '@components/common/ViewTabs'
import InfoNote from '@components/common/InfoNote'
import Pill from '@components/common/Pill'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import UncertainValue from '@components/common/UncertainValue'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { useUrlTab } from '@hooks/useUrlTab'
import { OPTIONS } from './airTrialModel'
import { TIER_LABELS_ES } from '@features/costing/pricingModel'
import {
  CASE_LABELS_ES,
  OPTION_LABELS_ES,
  RED_REASON,
  TAB_LIST,
  TRIAL_TABS,
  formatClp,
  formatClpMillions,
} from './constants'
import { useAirTrial } from './hooks/useAirTrial'
import PlanCard from './components/PlanCard'
import AnomalyGroups from './components/AnomalyGroups'
import ExcludedParts from './components/ExcludedParts'
import CalculationSteps from './components/CalculationSteps'

const red = (children) => (
  <UncertainValue verified={false} reason={RED_REASON}>
    {children}
  </UncertainValue>
)

const OPTION_OPTIONS = OPTIONS.map((o) => ({ value: o, label: OPTION_LABELS_ES[o] }))
const CASES = ['A', 'B', 'C']

export default function AirTrialPage() {
  const { data, loading, error } = useAirTrial()
  const [tab, setTab] = useUrlTab(Object.values(TRIAL_TABS))
  const [option, setOption] = useState(OPTIONS[0])

  if (loading) {
    return (
      <ContentWidth>
        <DetailPageSkeleton rows={6} />
      </ContentWidth>
    )
  }
  if (error || !data) {
    return (
      <ContentWidth>
        <ErrorState message="No se pudo armar el análisis: falta el vehículo en sourcing o sus cotizaciones." />
      </ContentWidth>
    )
  }

  const abbr = (id) => data.suppliers.find((s) => s.id === id)?.abbr ?? '?'
  const base = data.scenarios[0].results
  const planOf = (opt) => base[opt].B.single[0]
  const a = data.assumptions

  const headerNotes = [
    `Primera compra por avión, pagada por nosotros. El cliente elige entre Original y Más barato; para cada una hay un proveedor recomendado. Proveedores: ${data.suppliers.map((s) => `${s.abbr} ${s.name}`).join(', ')}.`,
    `Flete aéreo US$ ${(a.airUsdPerKgCents / 100).toLocaleString('es-CL', { minimumFractionDigits: 2 })} por kg cobrable, el mayor entre kg y cm³ ÷ ${a.airDivisor.toLocaleString('es-CL')}. Arancel general ${a.generalDutyBp / 100} %. Despacho, guía aérea y reparto: US$ ${Math.round(a.perShipmentUsdCents / 100)} por proveedor. Tipo de cambio CLP ${a.usdClp} por US$ (${a.fxAsOf}). Se editan en Ajustes.`,
    `Precio de venta de cada repuesto: el mayor entre lo que paga hoy el cliente menos el ahorro máximo (${data.pricing.maxSavingOemBp / 100} % en original, ${data.pricing.maxSavingAltBp / 100} % en alternativo) y el costo puesto en Chile dividido por (1 − ${data.pricing.minMarginBp / 100} %), el margen mínimo sobre la venta. Solo se ofrecen los repuestos donde el cliente ahorra al menos ${data.pricing.minSavingBp / 100} %. Los parámetros se editan en Ajustes.`,
    'El costo incluye la parte de cada repuesto en los gastos por embarque. Las piezas peligrosas o fuera de medida no entran en el pedido.',
  ]

  const purchaseColumns = [
    { id: 'name', label: 'Repuesto', sortValue: (i) => i.name, render: (i) => i.name },
    {
      id: 'supplier',
      label: 'Proveedor',
      sortValue: (i) => abbr(i.supplierId),
      width: 90,
      render: (i) => abbr(i.supplierId),
    },
    {
      id: 'quality',
      label: 'Calidad',
      sortValue: (i) => i.quality,
      width: 70,
      render: (i) => i.quality,
    },
    {
      id: 'qty',
      label: 'Cant.',
      sortValue: (i) => i.qty,
      width: 60,
      align: 'right',
      render: (i) => i.qty,
    },
    {
      id: 'cost',
      label: 'Costo aéreo',
      sortValue: (i) => i.fullUnitCostClp,
      width: 125,
      align: 'right',
      render: (i) => red(formatClp(i.fullUnitCostClp)),
    },
    {
      id: 'price',
      label: 'PVP neto',
      sortValue: (i) => i.sale.priceClp,
      width: 125,
      align: 'right',
      render: (i) => red(formatClp(i.sale.priceClp)),
    },
    {
      id: 'baseline',
      label: 'Precio REF',
      sortValue: (i) => i.unitBaselineClp,
      width: 125,
      align: 'right',
      render: (i) => formatClp(i.unitBaselineClp),
    },
    {
      id: 'saving',
      label: 'Ahorro',
      sortValue: (i) => i.unitBaselineClp - i.sale.priceClp,
      width: 125,
      align: 'right',
      render: (i) => red(formatClp(i.unitBaselineClp - i.sale.priceClp)),
    },
    {
      id: 'tier',
      label: 'Tramo',
      width: 120,
      render: (i) => TIER_LABELS_ES[i.sale.tier],
    },
  ]
  const purchase = [...planOf(option).items].sort(
    (x, y) => y.unitBaselineClp * y.qty - x.unitBaselineClp * x.qty,
  )

  const casesColumns = [
    { id: 'case', label: 'Qué se compra', render: (c) => CASE_LABELS_ES[c] },
    ...OPTIONS.flatMap((opt) => [
      {
        id: `${opt}-n`,
        label: OPTION_LABELS_ES[opt],
        width: 130,
        render: (c) => `${base[opt][c].parts} repuestos`,
      },
      {
        id: `${opt}-s`,
        label: 'Utilidad',
        width: 130,
        align: 'right',
        render: (c) => {
          const same = base[opt][c].single.find(
            (x) => x.supplierIds[0] === planOf(opt).supplierIds[0],
          )
          return same ? red(formatClpMillions(same.profitClp)) : '—'
        },
      },
    ]),
  ]

  const scenarioCell = (sc, opt) => {
    const top = sc.results[opt].B.single[0]
    return { top, same: top.supplierIds[0] === planOf(opt).supplierIds[0] }
  }
  const scenarioColumns = [
    { id: 'label', label: 'Si…', render: (sc) => sc.labelEs },
    ...OPTIONS.flatMap((opt) => [
      {
        id: `${opt}-who`,
        label: OPTION_LABELS_ES[opt],
        width: 130,
        render: (sc) => {
          const { top, same } = scenarioCell(sc, opt)
          return same ? (
            abbr(top.supplierIds[0])
          ) : (
            <Pill label={`Cambia a ${abbr(top.supplierIds[0])}`} tone="warning" />
          )
        },
      },
      {
        id: `${opt}-s`,
        label: 'Utilidad',
        width: 130,
        align: 'right',
        render: (sc) => red(formatClpMillions(scenarioCell(sc, opt).top.profitClp)),
      },
    ]),
  ]

  const missingColumns = [
    { id: 'what', label: 'Dato', render: (m) => m.titleEs },
    { id: 'todo', label: 'Qué hacer', width: 420, render: (m) => m.actionEs },
  ]

  return (
    <ContentWidth>
      <PageHeader
        title="Compra de prueba"
        actions={<InfoNote title="Cómo se calcula" paragraphs={headerNotes} />}
      />

      <ViewTabs value={tab} onChange={setTab} tabs={TAB_LIST} />

      {tab === TRIAL_TABS.PLAN ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            {OPTIONS.map((opt) => (
              <PlanCard key={opt} option={opt} data={data} />
            ))}
          </Box>
        </Box>
      ) : null}

      {tab === TRIAL_TABS.PURCHASE ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ToolbarSelectBox
              label="Opción"
              value={option}
              onChange={setOption}
              options={OPTION_OPTIONS}
            />
          </Box>
          <ListTable
            sortKey="trial-purchase"
            searchFields={(i) => [i.name, abbr(i.supplierId), i.quality]}
            searchPlaceholder="Buscar por repuesto, proveedor o calidad…"
            columns={purchaseColumns}
            rows={purchase}
            getRowKey={(i) => i.partId}
            emptyText="Sin repuestos."
          />
        </Box>
      ) : null}

      {tab === TRIAL_TABS.CALCULATION ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ToolbarSelectBox
              label="Opción"
              value={option}
              onChange={setOption}
              options={OPTION_OPTIONS}
            />
          </Box>
          <CalculationSteps key={option} option={option} data={data} />
        </Box>
      ) : null}

      {tab === TRIAL_TABS.SENSITIVITY ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <SectionTitle
              title="Qué volar"
              description="Cuánto ganamos según qué repuestos se compran por avión."
            />
            <ListTable columns={casesColumns} rows={CASES} getRowKey={(c) => c} />
          </Box>
          <Box>
            <SectionTitle
              title="Recomendación"
              description="Si cambia un supuesto, qué proveedor conviene y cuánto ganamos."
            />
            <ListTable columns={scenarioColumns} rows={data.scenarios} getRowKey={(sc) => sc.key} />
          </Box>
        </Box>
      ) : null}

      {tab === TRIAL_TABS.EXCLUDED ? <ExcludedParts logistics={data.logistics} /> : null}

      {tab === TRIAL_TABS.ANOMALIES ? (
        <AnomalyGroups anomalies={data.anomalies} suppliers={data.suppliers} />
      ) : null}

      {tab === TRIAL_TABS.MISSING ? (
        <ListTable columns={missingColumns} rows={data.missingData} getRowKey={(m) => m.titleEs} />
      ) : null}
    </ContentWidth>
  )
}
