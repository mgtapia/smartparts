'use client'

import { useSearchParams } from 'next/navigation'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import PanelSection from '@components/layout/PanelSection'
import SectionPanel from '@components/layout/SectionPanel'
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
import ViewTabs from '@components/common/ViewTabs'
import { useUrlTab } from '@hooks/useUrlTab'
import OrderSimulation from './components/OrderSimulation'

const QUALITY_TAG = { [PART_TYPE.ORIGINAL]: 'OEM', [PART_TYPE.ALTERNATIVE]: 'AFM' }
const QTY_COLUMN_WIDTH = 130

const CALCULATOR_HELP = [
  'Cada columna es una orden de compra de este repuesto a este proveedor con esa cantidad, costeada igual que el pedido completo: los gastos por embarque (despacho, documentos, reparto, mínimos del transporte en China, del seguro y del agente de aduanas) se cobran enteros una vez. Por eso una cantidad chica sale más cara por unidad.',
  'Cada fila de gasto muestra lo que corresponde a una unidad; el costo final total es el de la orden completa.',
  'Transporte en China: tarifa por tonelada-km × toneladas cobrables de la orden × la distancia del proveedor al puerto o aeropuerto, que se edita en su ficha. Sin distancia se usa el mayor entre un % del precio y el transporte con la distancia promedio de los proveedores con dato.',
  'Precio de venta: costo final más el margen elegido sobre el costo. El margen por defecto es 20 %.',
  'Las tarifas de flete y los gastos por etapa se definen en Parámetros. Sin tarifa de flete no se calcula: no se inventan tarifas.',
]

const perUnit = (micro, qty) => roundHalfUp(micro / qty)

/** Componentes que suman el costo final: sus motivos de "no verificado" pasan al total. */
const ALL_COMPONENTS = [
  'goods',
  'inland',
  'export',
  'freight',
  'insurance',
  'duty',
  'chile',
  'bank',
]

const number = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 3 })

function PartCalculator({ tabs }) {
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
        <PageHeader title="Pedido" />
        <SectionPanel>
          {tabs}
          <Typography variant="body2" color="text.secondary">
            Sin cotizaciones cargadas para calcular todavía.
          </Typography>
        </SectionPanel>
      </ContentWidth>
    )
  }

  const logisticsConfirmed = CONFIRMED_LOGISTICS_STATUSES.includes(part.logisticsStatus)
  const setQuantity = (index, value) =>
    setQuantities((prev) => prev.map((q, i) => (i === index ? value : q)))

  /** Una celda de la tabla: el valor, o "Falta dato" en rojo con el motivo si no se puede calcular. */
  /**
   * Una celda de la tabla: el valor en rojo con sus motivos si no está verificado, o "Falta
   * dato" en rojo con el motivo si no se puede calcular. `keys`: de qué componentes sale el
   * valor, para juntar sus motivos.
   */
  const cell = (order, pick, keys) => {
    if (!order) return '—'
    if (!order.cost) {
      return (
        <UncertainValue verified={false} reason={order.blockers.join('; ') || 'Falta un dato'}>
          Falta dato
        </UncertainValue>
      )
    }
    const micro = pick(order)
    if (micro == null) return '—'
    const reasons = [...new Set(keys.flatMap((k) => order.reasons[k] ?? []))]
    return (
      <UncertainValue verified={reasons.length === 0} reason={reasons.join('; ')}>
        <MoneyFromMicros micros={micro} currency="USD" />
      </UncertainValue>
    )
  }

  /** Fila de un componente del costo, por unidad. */
  const componentRow = (id, label) => ({
    id,
    label,
    value: (o) => cell(o, (r) => perUnit(r.cost[id], r.qty), [id]),
  })

  const ROWS = [
    componentRow('goods', 'Precio del proveedor'),
    componentRow('inland', 'Transporte en China'),
    componentRow('export', 'Gastos de exportación'),
    componentRow('freight', 'Flete'),
    componentRow('insurance', 'Seguro'),
    componentRow('duty', 'Arancel'),
    componentRow('chile', 'Gastos en Chile'),
    componentRow('bank', 'Transferencia bancaria'),
    {
      id: 'unitCost',
      label: 'Costo final unitario',
      value: (o) => cell(o, (r) => r.cost.unitLandedNet, ALL_COMPONENTS),
    },
    {
      id: 'totalCost',
      label: 'Costo final total',
      value: (o) => cell(o, (r) => r.cost.landedNet, ALL_COMPONENTS),
    },
    {
      id: 'vat',
      label: 'IVA recuperable total',
      value: (o) => cell(o, (r) => r.cost.vat, ['vat', 'duty']),
    },
    {
      id: 'unitSale',
      label: 'Precio de venta unitario',
      value: (o) => cell(o, (r) => r.unitSaleMicro, ALL_COMPONENTS),
    },
    {
      id: 'totalSale',
      label: 'Venta total',
      value: (o) => cell(o, (r) => r.totalSaleMicro, ALL_COMPONENTS),
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
      <PageHeader title="Pedido" />
      <SectionPanel>
        {tabs}

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

        <PanelSection>
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
        </PanelSection>

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
      </SectionPanel>
    </ContentWidth>
  )
}

const VIEWS = { PART: 'repuesto', ORDER: 'pedido' }

/**
 * Calculadora con dos vistas: el costo de un repuesto por cantidades, y la simulación de un
 * pedido completo del cliente repartido entre proveedores.
 */
export default function CostingCalculatorPage() {
  const [view, setView] = useUrlTab(Object.values(VIEWS))
  const tabs = (
    <ViewTabs
      value={view}
      onChange={setView}
      tabs={[
        { value: VIEWS.PART, label: 'Por repuesto' },
        { value: VIEWS.ORDER, label: 'Pedido completo' },
      ]}
    />
  )
  return view === VIEWS.ORDER ? <OrderSimulation tabs={tabs} /> : <PartCalculator tabs={tabs} />
}
