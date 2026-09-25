'use client'

import { useSearchParams } from 'next/navigation'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import AddIcon from '@mui/icons-material/Add'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import InfoNote from '@components/common/InfoNote'
import NumberField from '@components/common/NumberField'
import ToolbarButton from '@components/common/ToolbarButton'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import UncertainValue from '@components/common/UncertainValue'
import { MoneyFromMicros } from '@components/common/MoneyValue'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { GRID_GAP } from '@constants/layout'
import { CONFIRMED_LOGISTICS_STATUSES, PART_TYPE } from '@constants/enums'
import { roundHalfUp } from '@libs/money'
import CostParametersDialog from '@features/quotes/components/CostParametersDialog'
import SupplierAssumptionsDialog from '@features/quotes/components/SupplierAssumptionsDialog'
import { MODE_OPTIONS, supplierLabel } from '@features/quotes/constants'
import { useCalculator } from './hooks/useCalculator'

const QUALITY_TAG = { [PART_TYPE.ORIGINAL]: 'OEM', [PART_TYPE.ALTERNATIVE]: 'AFM' }
const QTY_COLUMN_WIDTH = 130

const CALCULATOR_HELP = [
  'Cada columna es una orden de compra de una sola línea con esa cantidad: incluye los costos fijos por embarque, como la prima mínima del seguro y el mínimo del agente de aduanas. Por eso una cantidad chica sale más cara por unidad.',
  'Precio de venta: costo final más el margen elegido sobre el costo. El margen por defecto es 20 %.',
  'Los gastos de origen y las tarifas de flete se definen en Parámetros y Supuestos. Sin ellos no se calcula: no se inventan tarifas.',
]

const perUnit = (micro, qty) => roundHalfUp(micro / qty)

const number = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 3 })

export default function CostingCalculatorPage() {
  const initialPartId = useSearchParams().get('partId')
  const calc = useCalculator(initialPartId)
  const { part, quote, quantities, setQuantities, orders, marginBp, assumptions } = calc

  if (calc.loading) {
    return (
      <ContentWidth>
        <DetailPageSkeleton rows={8} />
      </ContentWidth>
    )
  }
  if (calc.error) {
    return (
      <ContentWidth>
        <ErrorState />
      </ContentWidth>
    )
  }
  if (!part || !quote) {
    return (
      <ContentWidth>
        <PageHeader title="Calculadora" />
        <Card sx={{ p: 2, fontSize: 13, color: 'text.secondary' }}>
          Sin cotizaciones cargadas para calcular todavía.
        </Card>
      </ContentWidth>
    )
  }

  const logisticsConfirmed = CONFIRMED_LOGISTICS_STATUSES.includes(part.logisticsStatus)
  const setQuantity = (index, value) =>
    setQuantities((prev) => prev.map((q, i) => (i === index ? value : q)))

  /** Una celda de la tabla: el valor, o "Falta dato" en rojo con el motivo si no se puede calcular. */
  const cell = (order, pick, { verified = null } = {}) => {
    if (!order) return '—'
    const row = order.rows[0]
    if (!row.cost) {
      const reasons = [...order.result.blockers, ...row.blockers]
      return (
        <UncertainValue verified={false} reason={reasons.join('; ') || 'Falta un dato'}>
          Falta dato
        </UncertainValue>
      )
    }
    const micro = pick(row)
    if (micro == null) return '—'
    const isVerified = verified ?? order.unverified.length === 0
    return (
      <UncertainValue verified={isVerified} reason={order.unverified.join('; ')}>
        <MoneyFromMicros micros={micro} currency="USD" />
      </UncertainValue>
    )
  }

  const ROWS = [
    {
      id: 'price',
      label: 'Precio del proveedor',
      value: (o) =>
        cell(o, (r) => perUnit(r.cost.priceMicro, r.qty), {
          verified: quote.currencyConfirmed && !quote.inferred,
        }),
    },
    {
      id: 'origin',
      label: 'Gasto de origen',
      value: (o) => cell(o, (r) => perUnit(r.cost.originMicro, r.qty)),
    },
    {
      id: 'freight',
      label: 'Flete',
      value: (o) => cell(o, (r) => perUnit(r.cost.freightMicro, r.qty)),
    },
    {
      id: 'insurance',
      label: 'Seguro',
      value: (o) => cell(o, (r) => perUnit(r.cost.insuranceMicro, r.qty)),
    },
    {
      id: 'duty',
      label: 'Arancel',
      value: (o) => cell(o, (r) => perUnit(r.cost.dutyMicro, r.qty)),
    },
    {
      id: 'local',
      label: 'Gastos locales',
      value: (o) => cell(o, (r) => perUnit(r.cost.localCostsMicro, r.qty)),
    },
    {
      id: 'unitCost',
      label: 'Costo final unitario',
      value: (o) => cell(o, (r) => r.cost.unitLandedNetMicro),
    },
    {
      id: 'totalCost',
      label: 'Costo final total',
      value: (o) => cell(o, (r) => r.cost.landedNetMicro),
    },
    {
      id: 'vat',
      label: 'IVA recuperable',
      value: (o) => cell(o, (r) => r.cost.vatMicro),
    },
    {
      id: 'unitSale',
      label: 'Precio de venta unitario',
      value: (o) => cell(o, (r) => r.unitSaleMicro),
    },
    {
      id: 'totalSale',
      label: 'Venta total',
      value: (o) => cell(o, (r) => r.totalSaleMicro),
    },
  ]

  const columns = [
    { id: 'concept', label: 'Concepto', render: (row) => row.label },
    ...orders.map((entry, i) => ({
      id: `qty-${i}`,
      label: entry.qty ? `${entry.qty} u.` : 'Sin cantidad',
      width: QTY_COLUMN_WIDTH,
      align: 'right',
      render: (row) => row.value(entry.order),
    })),
  ]

  const partOptions = calc.parts.map((p) => ({ value: p.id, label: p.nameEs }))
  const quoteOptions = calc.partQuotes.map((q) => ({
    value: q.id,
    label: `${supplierLabel(q.supplier, q.supplierId)} · ${QUALITY_TAG[q.partType] ?? q.partType}`,
  }))

  return (
    <ContentWidth>
      <PageHeader title="Calculadora" />

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1.5 }}>
        <ToolbarSelectBox
          label="Repuesto"
          value={part.id}
          onChange={calc.setPartId}
          options={partOptions}
        />
        <ToolbarSelectBox
          label="Cotización"
          value={quote.id}
          onChange={calc.setQuoteId}
          options={quoteOptions}
        />
        <ToolbarSelectBox
          label="Modo de envío"
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
        <SupplierAssumptionsDialog
          supplierName={supplierLabel(quote.supplier, quote.supplierId)}
          settings={assumptions.settingsFor(quote.supplierId)}
          isAir={assumptions.mode === 'air'}
          onChange={(patch) => assumptions.updateSupplier(quote.supplierId, patch)}
        />
        <InfoNote title="Cómo leer la calculadora" paragraphs={CALCULATOR_HELP} />
      </Box>

      <Card sx={{ p: 2, mb: `${GRID_GAP}px` }}>
        <InfoGrid columns={5}>
          <InfoField label="Código">
            <UncertainValue
              verified={Boolean(part.code) && part.codeStatus === 'confirmed'}
              reason={part.code ? 'Código sin confirmar' : 'Sin código'}
            >
              {part.code ?? 'Sin código'}
            </UncertainValue>
          </InfoField>
          <InfoField label="Incoterm">
            <UncertainValue
              verified={quote.incotermConfirmed && Boolean(quote.incoterm)}
              reason={quote.incoterm ? 'Incoterm sin confirmar' : 'La cotización no lo indica'}
            >
              {quote.incoterm ?? 'Sin definir'}
            </UncertainValue>
          </InfoField>
          <InfoField label="Peso">
            <UncertainValue verified={logisticsConfirmed} reason="Peso sin confirmar">
              {number.format(part.weightG / 1000)} kg
            </UncertainValue>
          </InfoField>
          <InfoField label="Volumen">
            <UncertainValue verified={logisticsConfirmed} reason="Volumen sin confirmar">
              {number.format(part.volumeCm3)} cm³
            </UncertainValue>
          </InfoField>
          <InfoField label="Margen">
            <NumberField
              label=""
              adornment="%"
              value={marginBp / 100}
              onCommit={(n) => calc.setMarginBp(n === null ? 0 : Math.round(n * 100))}
            />
          </InfoField>
        </InfoGrid>
      </Card>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', flexWrap: 'wrap', mb: 1.5 }}>
        {quantities.map((qty, i) => (
          <Box key={i} sx={{ width: QTY_COLUMN_WIDTH }}>
            <NumberField
              label={`Cantidad ${i + 1}`}
              value={qty}
              placeholder="Unidades"
              onCommit={(n) => setQuantity(i, n === null ? null : Math.max(1, Math.round(n)))}
            />
          </Box>
        ))}
        <ToolbarButton
          label="Agregar cantidad"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => setQuantities((prev) => [...prev, null])}
        />
      </Box>

      <ListTable columns={columns} rows={ROWS} getRowKey={(row) => row.id} />
    </ContentWidth>
  )
}
