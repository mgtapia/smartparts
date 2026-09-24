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
import { MoneyFromMicros } from '@components/common/MoneyValue'
import UncertainValue from '@components/common/UncertainValue'
import { LoadingState, ErrorState } from '@components/common/AsyncState'
import { PART_TYPE } from '@constants/enums'
import { RADIUS } from '@constants/colors'
import CostAssumptionsMenu from './components/CostAssumptionsMenu'
import { MODE_OPTIONS, SUPPLIER_TYPE_LABELS_ES, formatIsoDate, sellsLabel } from './constants'
import { useCostAssumptions } from './hooks/useCostAssumptions'
import { useQuotationsData, costLine } from './hooks/useQuotations'

const VIEWS = { LIST: 'list', MATRIX: 'matrix' }
const VIEW_OPTIONS = [
  { value: VIEWS.LIST, label: 'Cotizaciones' },
  { value: VIEWS.MATRIX, label: 'Matriz por repuesto' },
]
const QUALITY_OPTIONS = [
  { value: PART_TYPE.ALTERNATIVE, label: 'Calidad AFM' },
  { value: PART_TYPE.ORIGINAL, label: 'Calidad OEM' },
]

const normalize = (s) => (s ?? '').toString().toLowerCase()

export default function QuotationsPage() {
  const { lines, quotations, loading, error } = useQuotationsData()
  const assumptions = useCostAssumptions()
  const { mode, rates, settingsFor } = assumptions
  const [view, setView] = useState(VIEWS.LIST)
  const [quality, setQuality] = useState(PART_TYPE.ALTERNATIVE)
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
    () => (isMatrix ? buildMatrix(lines, quality, term, { mode, rates, settingsFor }) : null),
    [isMatrix, lines, quality, term, mode, rates, settingsFor],
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
            ? `${matrix.rows.length} repuestos con cotización ${quality === PART_TYPE.ORIGINAL ? 'OEM' : 'AFM'}.`
            : `${filteredQuotations.length} de ${quotations.length} cotizaciones.`
        }
      />

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
        <ToolbarSearch
          value={search}
          onChange={setSearch}
          placeholder={isMatrix ? 'Buscar por repuesto o código…' : 'Buscar por proveedor…'}
        />
        <ToolbarSelectBox label="Vista" value={view} onChange={setView} options={VIEW_OPTIONS} />
        {isMatrix ? (
          <>
            <ToolbarSelectBox
              label="Calidad"
              value={quality}
              onChange={setQuality}
              options={QUALITY_OPTIONS}
            />
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
      </Box>

      {isMatrix ? (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Costo final por unidad, puesto en Chile y sin IVA; debajo, el precio del proveedor. El
            mejor de cada fila va marcado y se compara siempre el costo final, no el precio EXW.
            Rojo = estimado, sin verificar.
          </Typography>
          <ListTable
            columns={matrix.columns}
            rows={matrix.rows}
            getRowKey={(r) => r.part.id}
            emptyText="No hay cotizaciones con costo calculable para esta calidad."
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

/**
 * Matriz de decisión: una fila por repuesto, una columna por proveedor, cada
 * celda con el costo final unitario (puesto en Chile, sin IVA) para la calidad
 * elegida. Si un proveedor ofrece varias variantes de la misma pieza, la celda
 * muestra la más barata y lo avisa.
 */
function buildMatrix(lines, quality, term, { mode, rates, settingsFor }) {
  const supplierMap = new Map()
  const byPart = new Map()
  for (const line of lines) {
    if (line.quote.partType !== quality) continue
    if (
      term &&
      !normalize(line.part.nameEs).includes(term) &&
      !normalize(line.part.localCode?.code).includes(term)
    ) {
      continue
    }
    const cost = costLine(line, { mode, rates, settingsFor })
    if (cost.landedNetUsdMicro === null) continue
    supplierMap.set(line.quote.supplierId, line.quote.supplier?.name ?? line.quote.supplierId)
    if (!byPart.has(line.part.id)) byPart.set(line.part.id, { part: line.part, cells: new Map() })
    const cells = byPart.get(line.part.id).cells
    const current = cells.get(line.quote.supplierId)
    const variants = (current?.variants ?? 0) + 1
    if (!current || cost.landedNetUsdMicro < current.cost.landedNetUsdMicro) {
      cells.set(line.quote.supplierId, { line, cost, variants })
    } else {
      cells.set(line.quote.supplierId, { ...current, variants })
    }
  }

  const suppliers = [...supplierMap.entries()].map(([id, name]) => ({ id, name }))
  const wins = Object.fromEntries(suppliers.map((s) => [s.id, 0]))
  const rows = [...byPart.values()]
    .sort((a, b) => a.part.nameEs.localeCompare(b.part.nameEs, 'es'))
    .map((r) => {
      let best = null
      for (const [supplierId, cell] of r.cells) {
        if (
          best === null ||
          cell.cost.landedNetUsdMicro < r.cells.get(best).cost.landedNetUsdMicro
        ) {
          best = supplierId
        }
      }
      const compared = r.cells.size > 1
      if (compared) wins[best] += 1
      return { ...r, best: compared ? best : null }
    })

  const columns = [
    {
      id: 'part',
      label: 'Repuesto',
      render: (r) => (
        <Link href={`/parts/${r.part.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
          {r.part.nameEs}
          <Box component="span" sx={{ color: 'text.secondary', ml: 1, fontSize: 12 }}>
            {r.part.localCode?.code ?? ''}
          </Box>
        </Link>
      ),
    },
    ...suppliers.map((s) => ({
      id: s.id,
      label: s.name,
      width: 150,
      align: 'right',
      tooltip: `${s.name} — más barato en ${wins[s.id]} repuestos`,
      render: (r) => {
        const cell = r.cells.get(s.id)
        if (!cell) return '—'
        const landed = cell.cost.components.find((c) => c.code === 'landedNet')
        const price = cell.cost.components.find((c) => c.code === 'price')
        const note = [
          cell.line.quote.incoterm,
          cell.variants > 1 ? `${cell.variants} variantes` : cell.line.quote.variant,
        ]
          .filter(Boolean)
          .join(' · ')
        return (
          <Box
            sx={{
              bgcolor: r.best === s.id ? 'action.selected' : undefined,
              borderRadius: `${RADIUS.inputSmall}px`,
              px: 1,
              lineHeight: 1.2,
            }}
          >
            <UncertainValue verified={landed.verified} reason={landed.reasonEs}>
              <MoneyFromMicros micros={landed.usdMicro} currency="USD" />
            </UncertainValue>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ display: 'block', fontSize: 11 }}
            >
              {note} <MoneyFromMicros micros={price.usdMicro} currency="USD" />
            </Typography>
          </Box>
        )
      },
    })),
  ]

  return { suppliers, rows, columns }
}
