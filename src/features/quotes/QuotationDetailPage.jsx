'use client'

import { useMemo, useState } from 'react'
import { confirmQuotationFields } from '@libs/repos/quotesRepo'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import { useRouteId } from '@hooks/useRouteId'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ToolbarButton from '@components/common/ToolbarButton'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import SourcedValueDialog from '@components/common/SourcedValueDialog'
import InfoNote from '@components/common/InfoNote'
import ListTable from '@components/common/ListTable'
import ToolbarSearch from '@components/common/ToolbarSearch'
import MoneyValue, { MoneyFromMicros } from '@components/common/MoneyValue'
import UncertainValue from '@components/common/UncertainValue'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { PART_TYPE } from '@constants/enums'
import { usePersistentState, SET_STORAGE } from '@hooks/usePersistentState'
import ColumnsMenu from '@features/catalog/components/ColumnsMenu'
import CostParametersDialog from './components/CostParametersDialog'
import SupplierAssumptionsDialog from './components/SupplierAssumptionsDialog'
import QualityChips from './components/QualityChips'
import QuotationOrigin from './components/QuotationOrigin'
import VehicleLinks from '@features/vehicles/components/VehicleLinks'
import {
  COLUMN_CHOICES,
  COST_COLUMNS,
  CURRENCY_CHOICES,
  INCOTERM_CHOICES,
  DEFAULT_HIDDEN,
  DETAIL_HELP,
  formatDate,
  supplierLabel,
} from './constants'
import { useCostAssumptions } from './hooks/useCostAssumptions'
import { useQuotationsData, costLine, unitPriceMoney } from './hooks/useQuotations'

const FIELDS = {
  incoterm: {
    key: 'incoterm',
    label: 'Incoterm',
    options: INCOTERM_CHOICES,
    current: (q) => q.incoterms[0] ?? '',
  },
  place: {
    key: 'incotermPlace',
    label: 'lugar del Incoterm',
    current: (q) => q.incotermPlaces[0] ?? '',
  },
  currency: {
    key: 'currency',
    label: 'moneda',
    options: CURRENCY_CHOICES,
    current: (q) => (q.currencies[0] === 'sin definir' ? '' : (q.currencies[0] ?? '')),
  },
}

const normalize = (s) => (s ?? '').toString().toLowerCase()

export default function QuotationDetailPage() {
  const quotationId = useRouteId()
  const { quotations, loading, error, reload } = useQuotationsData()
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

  const [editing, setEditing] = useState(null)

  const quotation = quotations.find((q) => q.id === quotationId) ?? null
  const term = normalize(search.trim())

  const rows = useMemo(() => {
    if (!quotation) return []
    return quotation.lines
      .filter(
        ({ part }) =>
          !term || normalize(part.nameEs).includes(term) || normalize(part.code).includes(term),
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
        <DetailPageSkeleton />
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
        <PageHeader
          back={{ href: '/quotes', label: 'Cotizaciones' }}
          title="Cotización no encontrada"
        />
      </ContentWidth>
    )
  }

  const supplier = quotation.supplier
  const sample = rows.find((r) => r.cost.components.length > 0)

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
          {line.part.code ?? '—'}
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
            verified={q.currencyConfirmed && !q.inferred}
            reason={
              q.inferred
                ? q.inferredNote
                : q.currencyConfirmed
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
      <PageHeader
        back={{ href: '/quotes', label: 'Cotizaciones' }}
        title={supplierLabel(supplier, 'Proveedor')}
        description={quotation.sourceFile ?? 'Sin archivo de origen'}
        meta={`${rows.length} de ${quotation.lineCount} SKU.`}
        actions={
          <ToolbarButton label="Ficha del proveedor" href={`/suppliers/${quotation.supplierId}`} />
        }
      />

      <Card sx={{ p: 2, mb: 1.5 }}>
        <InfoGrid>
          <InfoField label="Incoterm" onEdit={() => setEditing(FIELDS.incoterm)}>
            <UncertainValue
              verified={quotation.incotermConfirmed && quotation.incoterms.length > 0}
              reason={
                quotation.incoterms.length > 0
                  ? 'Incoterm sin confirmar por escrito'
                  : 'La cotización no indica Incoterm'
              }
            >
              {quotation.incoterms.join(', ') || 'Sin definir'}
            </UncertainValue>
          </InfoField>
          <InfoField
            label="Origen"
            // Solo se edita si la cotización nombra su propio lugar; si no, es la ubicación del proveedor.
            onEdit={
              quotation.incotermPlaces.length > 0 ? () => setEditing(FIELDS.place) : undefined
            }
            hint={
              quotation.incotermPlaces.length > 0
                ? undefined
                : 'Heredado de la ubicación del proveedor. Se cambia en su ficha.'
            }
          >
            <QuotationOrigin quotation={quotation} />
          </InfoField>
          <InfoField label="Moneda" onEdit={() => setEditing(FIELDS.currency)}>
            <UncertainValue
              verified={quotation.currencyConfirmed}
              reason="Moneda sin confirmar por el proveedor"
            >
              {quotation.currencies.join(', ')}
            </UncertainValue>
          </InfoField>
          <InfoField label="Oferta">
            <QualityChips quotation={quotation} />
          </InfoField>
          <InfoField label="Vehículos">
            <VehicleLinks vehicles={quotation.vehicles} />
          </InfoField>
          <InfoField label="Fecha">{formatDate(quotation.capturedAt)}</InfoField>
        </InfoGrid>
      </Card>

      {editing ? (
        <SourcedValueDialog
          title={`Confirmar ${editing.label}`}
          label={editing.label}
          initial={editing.current(quotation)}
          options={editing.options}
          onClose={() => setEditing(null)}
          onSave={async (value, source) => {
            await confirmQuotationFields(
              quotation.lines.map((l) => l.quote),
              { [editing.key]: value },
              source,
            )
            reload()
          }}
        />
      ) : null}

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
            Cálculo
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
