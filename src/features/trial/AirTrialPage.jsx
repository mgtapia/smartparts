'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import ViewTabs from '@components/common/ViewTabs'
import InfoNote from '@components/common/InfoNote'
import Pill from '@components/common/Pill'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import UncertainValue from '@components/common/UncertainValue'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { useUrlTab } from '@hooks/useUrlTab'
import { FOCUS_MARGIN_BP, OPTIONS } from './airTrialModel'
import {
  CASE_LABELS_ES,
  MARGIN_OPTIONS,
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
  const [marginBp, setMarginBp] = useState(FOCUS_MARGIN_BP)
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
    `Flete aéreo US$ ${(a.airUsdPerKgCents / 100).toLocaleString('es-CL', { minimumFractionDigits: 2 })} por kg cobrable, el mayor entre kg y cm³ ÷ ${a.airDivisor.toLocaleString('es-CL')}. Arancel general ${a.generalDutyBp / 100} %. Despacho, guía aérea y reparto: US$ ${Math.round(a.perShipmentUsdCents / 100)} por proveedor. Tipo de cambio CLP ${a.usdClp} por US$ (${a.fxAsOf}). Se editan en la Calculadora.`,
    'Los márgenes son sobre el costo puesto en Chile. Las piezas peligrosas o fuera de medida no entran en el pedido.',
  ]

  const purchaseColumns = [
    { id: 'name', label: 'Repuesto', render: (i) => i.name },
    { id: 'quality', label: 'Calidad', width: 80, render: (i) => i.quality },
    { id: 'qty', label: 'Cant.', width: 70, align: 'right', render: (i) => i.qty },
    {
      id: 'cost',
      label: 'Costo en Chile',
      width: 130,
      align: 'right',
      render: (i) => red(formatClp(i.unitCostClp)),
    },
    {
      id: 'baseline',
      label: 'Cliente hoy',
      width: 130,
      align: 'right',
      render: (i) => formatClp(i.unitBaselineClp),
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
        label: `${OPTION_LABELS_ES[opt]}: repuestos`,
        width: 130,
        align: 'right',
        render: (c) => base[opt][c].parts,
      },
      {
        id: `${opt}-s`,
        label: 'Ahorro',
        width: 130,
        align: 'right',
        render: (c) => {
          const same = base[opt][c].single.find(
            (x) => x.supplierIds[0] === planOf(opt).supplierIds[0],
          )
          return same ? red(formatClpMillions(same.savingsClp[FOCUS_MARGIN_BP])) : '—'
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
        label: 'Ahorro',
        width: 130,
        align: 'right',
        render: (sc) =>
          red(formatClpMillions(scenarioCell(sc, opt).top.savingsClp[FOCUS_MARGIN_BP])),
      },
    ]),
  ]

  const dash = (value, format) => (value == null ? '—' : format(value))
  const excludedColumns = [
    { id: 'name', label: 'Repuesto', render: (l) => l.name },
    { id: 'reasons', label: 'Motivo', width: 300, render: (l) => l.reasons.join('; ') },
    {
      id: 'kg',
      label: 'Kg cobrables',
      width: 110,
      align: 'right',
      render: (l) => dash(l.kg, (v) => v.toLocaleString('es-CL')),
    },
    {
      id: 'cost',
      label: 'Costo en Chile',
      width: 130,
      align: 'right',
      render: (l) => dash(l.costClp, (v) => red(formatClp(v))),
    },
    {
      id: 'baseline',
      label: 'Cliente hoy',
      width: 130,
      align: 'right',
      render: (l) => dash(l.baselineClp, formatClp),
    },
  ]

  const missingColumns = [
    { id: 'what', label: 'Dato', render: (m) => m.titleEs },
    { id: 'todo', label: 'Qué hacer', width: 420, render: (m) => m.actionEs },
  ]

  return (
    <ContentWidth>
      <PageHeader
        title="Compra de prueba"
        meta={`${data.partCount} repuestos, vía aérea.`}
        actions={<InfoNote title="Cómo se calcula" paragraphs={headerNotes} />}
      />

      <ViewTabs value={tab} onChange={setTab} tabs={TAB_LIST} />

      {tab === TRIAL_TABS.PLAN ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box>
            <ToolbarSelectBox
              label="Margen sobre el costo en Chile"
              value={marginBp}
              onChange={setMarginBp}
              options={MARGIN_OPTIONS}
            />
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            {OPTIONS.map((opt) => (
              <PlanCard key={opt} option={opt} data={data} marginBp={marginBp} />
            ))}
          </Box>
        </Box>
      ) : null}

      {tab === TRIAL_TABS.PURCHASE ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box>
            <ToolbarSelectBox
              label="Opción"
              value={option}
              onChange={setOption}
              options={OPTION_OPTIONS}
            />
          </Box>
          <ListTable
            columns={purchaseColumns}
            rows={purchase}
            getRowKey={(i) => i.partId}
            emptyText="Sin repuestos."
          />
        </Box>
      ) : null}

      {tab === TRIAL_TABS.SENSITIVITY ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Qué volar
            </Typography>
            <ListTable columns={casesColumns} rows={CASES} getRowKey={(c) => c} />
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Recomendación
            </Typography>
            <ListTable columns={scenarioColumns} rows={data.scenarios} getRowKey={(sc) => sc.key} />
          </Box>
        </Box>
      ) : null}

      {tab === TRIAL_TABS.EXCLUDED ? (
        <ListTable
          columns={excludedColumns}
          rows={data.logistics}
          getRowKey={(l) => l.partId}
          emptyText="Todos los repuestos entran en el pedido aéreo."
        />
      ) : null}

      {tab === TRIAL_TABS.ANOMALIES ? (
        <AnomalyGroups anomalies={data.anomalies} suppliers={data.suppliers} />
      ) : null}

      {tab === TRIAL_TABS.MISSING ? (
        <ListTable columns={missingColumns} rows={data.missingData} getRowKey={(m) => m.titleEs} />
      ) : null}
    </ContentWidth>
  )
}
