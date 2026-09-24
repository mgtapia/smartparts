'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import ToolbarSearch from '@components/common/ToolbarSearch'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import ViewTabs from '@components/common/ViewTabs'
import UncertainValue from '@components/common/UncertainValue'
import { LoadingState, ErrorState } from '@components/common/AsyncState'
import CostAssumptionsMenu from './components/CostAssumptionsMenu'
import InfoNote from '@components/common/InfoNote'
import {
  MATRIX_HELP,
  MODE_OPTIONS,
  SUPPLIER_TYPE_LABELS_ES,
  formatIsoDate,
  sellsLabel,
} from './constants'
import { useCostAssumptions } from './hooks/useCostAssumptions'
import { useQuotationsData } from './hooks/useQuotations'
import {
  METRICS,
  METRIC_OPTIONS,
  QUALITY_FILTERS,
  QUALITY_OPTIONS,
  buildMatrix,
} from './partMatrix'

const VIEWS = { LIST: 'list', MATRIX: 'matrix' }
const normalize = (s) => (s ?? '').toString().toLowerCase()

export default function QuotationsPage() {
  const { lines, quotations, loading, error } = useQuotationsData()
  const assumptions = useCostAssumptions()
  const { mode, rates, settingsFor } = assumptions
  const [view, setView] = useState(VIEWS.LIST)
  const [metric, setMetric] = useState(METRICS.PRICE)
  const [quality, setQuality] = useState(QUALITY_FILTERS.BOTH)
  const [search, setSearch] = useState('')

  const term = normalize(search.trim())
  const isMatrix = view === VIEWS.MATRIX

  const filteredQuotations = useMemo(
    () =>
      quotations.filter(
        (q) =>
          !term ||
          normalize(q.supplier?.name).includes(term) ||
          normalize(q.sourceFile).includes(term),
      ),
    [quotations, term],
  )

  const matrix = useMemo(
    () =>
      isMatrix ? buildMatrix(lines, metric, term, quality, { mode, rates, settingsFor }) : null,
    [isMatrix, lines, metric, term, quality, mode, rates, settingsFor],
  )

  if (loading) {
    return (
      <ContentWidth>
        <LoadingState />
      </ContentWidth>
    )
  }
  if (error) {
    return (
      <ContentWidth>
        <ErrorState />
      </ContentWidth>
    )
  }

  return (
    <ContentWidth>
      <PageHeader
        title="Cotizaciones"
        meta={
          isMatrix
            ? `${matrix.rows.length} repuestos cotizados.`
            : `${filteredQuotations.length} de ${quotations.length} cotizaciones.`
        }
      />

      <ViewTabs
        value={view}
        onChange={setView}
        tabs={[
          { value: VIEWS.LIST, label: `Por proveedor (${quotations.length})` },
          { value: VIEWS.MATRIX, label: 'Por repuesto' },
        ]}
      />

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
        <ToolbarSearch
          value={search}
          onChange={setSearch}
          placeholder={isMatrix ? 'Buscar por repuesto o código…' : 'Buscar por proveedor…'}
        />
        {isMatrix ? (
          <>
            <ToolbarSelectBox
              label="Calidad"
              value={quality}
              onChange={setQuality}
              options={QUALITY_OPTIONS}
            />
            <ToolbarSelectBox
              label="Valor"
              value={metric}
              onChange={setMetric}
              options={METRIC_OPTIONS}
            />
            <InfoNote paragraphs={MATRIX_HELP} />
            {metric === METRICS.LANDED ? (
              <>
                <ToolbarSelectBox
                  label="Modo de envío"
                  value={assumptions.mode}
                  onChange={assumptions.setMode}
                  options={MODE_OPTIONS}
                />
                <CostAssumptionsMenu
                  rates={assumptions.rates}
                  setRates={assumptions.setRates}
                  suppliers={matrix.suppliers}
                  settingsFor={assumptions.settingsFor}
                  updateSupplier={assumptions.updateSupplier}
                  onReset={assumptions.reset}
                />
              </>
            ) : null}
          </>
        ) : null}
      </Box>

      {isMatrix ? (
        <>
          <ListTable
            columns={matrix.columns}
            rows={matrix.rows}
            getRowKey={(r) => r.part.id}
            emptyText="Sin resultados."
          />
        </>
      ) : (
        <ListTable
          columns={LIST_COLUMNS}
          rows={filteredQuotations}
          getRowKey={(q) => q.id}
          getRowHref={(q) => `/quotes/${q.id}`}
          emptyText="Sin cotizaciones cargadas todavía."
        />
      )}
    </ContentWidth>
  )
}

const LIST_COLUMNS = [
  {
    id: 'supplier',
    label: 'Proveedor',
    render: (q) => <span title={q.supplier?.name}>{q.supplier?.name ?? q.supplierId}</span>,
  },
  {
    id: 'type',
    label: 'Tipo',
    width: 100,
    render: (q) => (
      <UncertainValue verified={false} reason="Declarado por el proveedor, sin verificar">
        {SUPPLIER_TYPE_LABELS_ES[q.supplier?.supplier_type] ?? 'Sin confirmar'}
      </UncertainValue>
    ),
  },
  {
    id: 'sells',
    label: 'Vende',
    width: 90,
    tooltip: 'Calidades que ofrece según lo que cotizó: OEM, AFM o ambas.',
    render: (q) => (
      <UncertainValue
        verified={q.originalCount === 0}
        reason="OEM declarado por el proveedor: se confirma con foto o muestra"
      >
        {sellsLabel(q)}
      </UncertainValue>
    ),
  },
  {
    id: 'incoterm',
    label: 'Incoterm',
    width: 130,
    render: (q) =>
      q.incoterms.length > 0 ? (
        q.incoterms.join(', ')
      ) : (
        <UncertainValue verified={false} reason="La cotización no indica Incoterm">
          Sin definir
        </UncertainValue>
      ),
  },
  {
    id: 'currency',
    label: 'Moneda',
    width: 70,
    render: (q) => (
      <UncertainValue verified={q.currencyConfirmed} reason="Moneda sin confirmar por el proveedor">
        {q.currencies.join(', ')}
      </UncertainValue>
    ),
  },
  {
    id: 'sku',
    label: 'SKU',
    width: 170,
    align: 'right',
    tooltip: 'SKU cotizados = OEM + AFM',
    render: (q) => `${q.lineCount} = ${q.originalCount} OEM + ${q.alternativeCount} AFM`,
  },
  {
    id: 'valid',
    label: 'Vigencia',
    width: 100,
    render: (q) =>
      q.validUntil ? (
        formatIsoDate(q.validUntil)
      ) : (
        <UncertainValue verified={false} reason="La cotización no indica vigencia">
          Sin vigencia
        </UncertainValue>
      ),
  },
]
