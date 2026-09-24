'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import InfoNote from '@components/common/InfoNote'
import ListTable from '@components/common/ListTable'
import ToolbarSearch from '@components/common/ToolbarSearch'
import MoneyValue, { MoneyFromMicros } from '@components/common/MoneyValue'
import UncertainValue from '@components/common/UncertainValue'
import { LoadingState, ErrorState } from '@components/common/AsyncState'
import { PART_TYPE, SUPPLIER_TYPE_LABELS_ES } from '@constants/enums'
import { usePersistentState, SET_STORAGE } from '@hooks/usePersistentState'
import ColumnsMenu from '@features/catalog/components/ColumnsMenu'
import CostParametersDialog from './components/CostParametersDialog'
import SupplierAssumptionsDialog from './components/SupplierAssumptionsDialog'
import QualityChips from './components/QualityChips'
import {
  COLUMN_CHOICES,
  COST_COLUMNS,
  DEFAULT_HIDDEN,
  DETAIL_HELP,
  formatDate,
  supplierLabel,
  formatIsoDate,
} from './constants'
import { useCostAssumptions } from './hooks/useCostAssumptions'
import { useQuotationsData, costLine, unitPriceMoney } from './hooks/useQuotations'

const normalize = (s) => (s ?? '').toString().toLowerCase()

export default function QuotationDetailPage({ quotationId }) {
  const { quotations, loading, error } = useQuotationsData()
  const assumptions = useCostAssumptions()
  const { mode, rates, settingsFor } = assumptions
  const [search, setSearch] = useState('')
  const [hidden, setHidden] = usePersistentState(
    'quotes.detail.hiddenColumns',
    DEFAULT_HIDDEN,
    SET_STORAGE,
  )
  const toggleColumn = (id) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const quotation = quotations.find((q) => q.id === quotationId) ?? null
  const term = normalize(search.trim())

  const rows = useMemo(() => {
    if (!quotation) return []
    return quotation.lines
      .filter(
        ({ part }) =>
          !term ||
          normalize(part.nameEs).includes(term) ||
          normalize(part.localCode?.code).includes(term),
      )
      .map((line) => {
        const cost = costLine(line, { mode, rates, settingsFor })
        return { line, cost, byCode: Object.fromEntries(cost.components.map((c) => [c.code, c])) }
      })
      .sort((a, b) => a.line.part.nameEs.localeCompare(b.line.part.nameEs, 'es'))
  }, [quotation, term, mode, rates, settingsFor])

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
  if (!quotation) {
    return (
      <ContentWidth>
        <PageHeader title="Cotización no encontrada" />
        <Button component={Link} href="/quotes">
          Volver a cotizaciones
        </Button>
      </ContentWidth>
    )
  }

  const supplier = quotation.supplier
  const sample = rows.find((r) => r.cost.components.length > 0)
  const declarations = supplier?.declarations ?? []

  const allColumns = [
    {
      id: 'part',
      label: 'Pieza',
      render: ({ line }) => (
        <Link
          href={`/parts/${line.part.id}`}
          style={{ color: 'inherit', textDecoration: 'none' }}
          title={line.part.nameEs}
        >
          {line.part.nameEs}
        </Link>
      ),
    },
    {
      id: 'category',
      label: 'Categoría',
      width: 100,
      render: ({ line }) => line.part.categoryLabel,
    },
    { id: 'position', label: 'Lugar', width: 80, render: ({ line }) => line.part.position ?? '—' },
    {
      id: 'code',
      label: 'Código',
      width: 100,
      render: ({ line }) => (
        <Box component="span" sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: 12 }}>
          {line.part.localCode?.code ?? '—'}
        </Box>
      ),
    },
    {
      id: 'quality',
      label: 'Calidad',
      width: 90,
      render: ({ line }) => (
        <UncertainValue
          verified={false}
          reason="Calidad declarada por el proveedor: se confirma con foto o muestra"
        >
          {line.quote.partType === PART_TYPE.ORIGINAL ? 'OEM' : 'AFM'}
        </UncertainValue>
      ),
    },
    {
      id: 'variant',
      label: 'Variante',
      width: 110,
      render: ({ line }) => line.quote.variant ?? '—',
    },
    {
      id: 'price',
      label: 'Precio',
      width: 90,
      align: 'right',
      tooltip:
        'Precio unitario del proveedor, en su moneda. Si tiene tramos por volumen se usa el más alto; el detalle por volumen va en el simulador.',
      render: ({ line }) => {
        const q = line.quote
        const tiers = q.priceTiers
          .slice()
          .sort((a, b) => b.minQty - a.minQty)
          .map(
            (t) =>
              `${t.minQty === 1 ? 'menos de 10' : `${t.minQty} o más`}: ${t.amount.toFixed(2)}`,
          )
          .join(' · ')
        return (
          <UncertainValue
            verified={q.currencyConfirmed}
            reason={
              q.currencyConfirmed
                ? tiers
                : `Moneda sin confirmar por el proveedor${tiers ? ` — ${tiers}` : ''}`
            }
          >
            {q.currency ? <MoneyValue money={unitPriceMoney(q)} /> : q.priceAmount.toFixed(2)}
          </UncertainValue>
        )
      },
    },
    ...COST_COLUMNS.map((c) => ({
      id: c.code,
      label: c.label,
      width: 90,
      align: 'right',
      render: ({ cost, byCode }) => {
        if (cost.blockers.length > 0) {
          return (
            <UncertainValue verified={false} reason={cost.blockers.join('; ')}>
              —
            </UncertainValue>
          )
        }
        const comp = byCode[c.code]
        return (
          <UncertainValue verified={comp.verified} reason={comp.reasonEs}>
            <MoneyFromMicros micros={comp.usdMicro} currency="USD" />
          </UncertainValue>
        )
      },
    })),
  ]
  const columns = allColumns.filter((c) => !hidden.has(c.id))

  return (
    <ContentWidth>
      <Button component={Link} href="/quotes" size="small" sx={{ mb: 1, textTransform: 'none' }}>
        ← Cotizaciones
      </Button>
      <PageHeader
        title={supplierLabel(supplier, 'Proveedor')}
        description={quotation.sourceFile ?? 'Sin archivo de origen'}
        meta={`${rows.length} de ${quotation.lineCount} SKU.`}
      />

      <Card sx={{ p: 2, mb: 1.5 }}>
        <Box sx={{ display: 'flex', columnGap: 4, rowGap: 1.5, flexWrap: 'wrap' }}>
          <Info label="Razón social">{supplier?.name ?? '—'}</Info>
          <Info label="Tipo">
            <UncertainValue verified={false} reason="Declarado por el proveedor, sin verificar">
              {SUPPLIER_TYPE_LABELS_ES[supplier?.supplier_type] ?? 'Sin confirmar'}
            </UncertainValue>
          </Info>
          <Info label="Incoterm">
            {quotation.incoterms.join(', ') || (
              <UncertainValue verified={false} reason="La cotización no indica Incoterm">
                Sin definir
              </UncertainValue>
            )}
          </Info>
          <Info label="Origen">
            {quotation.incotermPlaces.join(', ') || (
              <UncertainValue
                verified={false}
                reason="La cotización no indica el lugar del Incoterm"
              >
                Sin lugar
              </UncertainValue>
            )}
          </Info>
          <Info label="Moneda">
            <UncertainValue
              verified={quotation.currencyConfirmed}
              reason="Moneda sin confirmar por el proveedor"
            >
              {quotation.currencies.join(', ')}
            </UncertainValue>
          </Info>
          <Info label="Fecha">{formatDate(quotation.capturedAt)}</Info>
          <Info label="Vigencia">
            {quotation.validUntil ? (
              formatIsoDate(quotation.validUntil)
            ) : (
              <UncertainValue verified={false} reason="La cotización no indica vigencia">
                Sin vigencia
              </UncertainValue>
            )}
          </Info>
          <Info label="Vende">
            <QualityChips quotation={quotation} />
          </Info>
          <Info label="Repuestos">{quotation.partCount}</Info>
          <Info label="Por revisar">
            <UncertainValue
              verified={quotation.pendingCount === 0}
              reason="Calidad y emparejamiento pendientes de revisión humana"
            >
              {quotation.pendingCount}
            </UncertainValue>
          </Info>
        </Box>
        {declarations.length > 0 ? (
          <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 1.5 }}>
            Lo que declara el proveedor (sin verificar): {declarations.join(' · ')}
          </Typography>
        ) : null}
      </Card>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
        <ToolbarSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar por pieza o código…"
        />
        <CostParametersDialog
          mode={mode}
          setMode={assumptions.setMode}
          rates={rates}
          setRates={assumptions.setRates}
          onReset={assumptions.reset}
        />
        <SupplierAssumptionsDialog
          supplierName={supplierLabel(supplier, quotation.supplierId)}
          settings={settingsFor(quotation.supplierId)}
          onChange={(patch) => assumptions.updateSupplier(quotation.supplierId, patch)}
        />
        <ColumnsMenu hiddenColumns={hidden} onToggle={toggleColumn} columns={COLUMN_CHOICES} />
        <InfoNote paragraphs={DETAIL_HELP} />
      </Box>

      <Box sx={{ mb: 2 }}>
        <ListTable columns={columns} rows={rows} getRowKey={({ line }) => line.quote.id} />
      </Box>

      {sample ? (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
            Cómo se calcula cada costo
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Por unidad. Ejemplo con la primera línea ({sample.line.part.nameEs}); las fórmulas son
            las mismas para todas. Rojo = todavía no verificado.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {sample.cost.components.map((c) => (
              <Box key={c.code}>
                <Typography variant="body2" sx={{ fontSize: 13 }}>
                  <UncertainValue verified={c.verified} reason={c.reasonEs}>
                    {c.labelEs}
                  </UncertainValue>
                  {' — '}
                  {c.formulaEs}
                </Typography>
                {c.reasonEs ? (
                  <Typography variant="caption" color="error.main">
                    Sin verificar: {c.reasonEs}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Box>
        </Card>
      ) : null}
    </ContentWidth>
  )
}

function Info({ label, children }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontSize: 13 }}>
        {children}
      </Typography>
    </Box>
  )
}
