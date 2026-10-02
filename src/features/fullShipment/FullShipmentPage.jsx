'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import SectionPanel from '@components/layout/SectionPanel'
import ListTable from '@components/common/ListTable'
import ViewTabs from '@components/common/ViewTabs'
import InfoNote from '@components/common/InfoNote'
import Pill from '@components/common/Pill'
import Toolbar from '@components/common/Toolbar'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import ToolbarButton from '@components/common/ToolbarButton'
import UncertainValue from '@components/common/UncertainValue'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { useUrlTab } from '@hooks/useUrlTab'
import { downloadCsv } from '@libs/csv'
import { TIER_LABELS_ES, isOffered } from '@features/costing/pricingModel'
import AnomalyGroups from '@features/trial/components/AnomalyGroups'
import { formatClp, formatClpMillions } from '@features/trial/constants'
import {
  SHIPMENT_OPTIONS,
  SHIPMENT_OPTION_LABELS_ES,
  SUPPLIER_MODES,
  SUPPLIER_MODE_LABELS_ES,
  hasPriceGap,
} from '@features/costing/fullShipmentModel'
import { useFullShipment } from './hooks/useFullShipment'
import { FULL_SHIPMENT_TABS, TAB_LIST, CONTAINER_OPTIONS, RED_REASON } from './constants'

const red = (children) => (
  <UncertainValue verified={false} reason={RED_REASON}>
    {children}
  </UncertainValue>
)

const SUPPLIER_MODE_OPTIONS = SUPPLIER_MODES.map((m) => ({
  value: m,
  label: SUPPLIER_MODE_LABELS_ES[m],
}))

export default function FullShipmentPage() {
  const [mode, setMode] = useState(CONTAINER_OPTIONS[0].value)
  const [supplierMode, setSupplierMode] = useState(SUPPLIER_MODES[0])
  const { data, loading, error } = useFullShipment(mode, supplierMode)
  const [tab, setTab] = useUrlTab(Object.values(FULL_SHIPMENT_TABS))
  const [option, setOption] = useState(SHIPMENT_OPTIONS[0])

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
  const result = data.results[option]

  const headerNotes = [
    `Pedido con la cantidad estimada real de cada repuesto (no 1 unidad como en la Compra de prueba). Proveedores: ${data.suppliers.map((s) => `${s.abbr} ${s.name}`).join(', ')}.`,
    'El flete es por contenedor completo (FCL): se cobra × el número de contenedores que alcanza para el peso y el volumen de todo el pedido consolidado, no por pieza.',
    'La tarifa de flete por contenedor sigue siendo una referencia editable en Ajustes, no una cotización real de un forwarder — por eso todo el costo va en rojo.',
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
      width: 70,
      align: 'right',
      render: (i) => i.qty,
    },
    {
      id: 'cost',
      label: 'Costo FCL',
      sortValue: (i) => i.unitCostClp,
      width: 125,
      align: 'right',
      render: (i) => red(formatClp(i.unitCostClp)),
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
      id: 'tier',
      label: 'Tramo',
      width: 150,
      render: (i) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {i.sale.tier ? TIER_LABELS_ES[i.sale.tier] : '—'}
          {hasPriceGap(i) ? (
            <Tooltip title="El PVP es 5 veces o más el costo: el precio de referencia puede estar mal o ser de otra pieza.">
              <span>
                <Pill label="Revisar REF" tone="warning" />
              </span>
            </Tooltip>
          ) : null}
        </Box>
      ),
    },
  ]
  const purchase = result.items
    .filter((i) => isOffered(i.sale.tier))
    .sort((x, y) => (y.unitBaselineClp ?? 0) * y.qty - (x.unitBaselineClp ?? 0) * x.qty)

  const calcColumns = [
    { id: 'label', label: 'Paso', render: (r) => r.labelEs },
    { id: 'value', label: 'Monto', align: 'right', render: (r) => red(formatClp(r.valueClp)) },
  ]
  const calcRows = result.items.length
    ? [
        { labelEs: 'Compra al proveedor (FOB)', valueClp: result.totals.goodsClp },
        { labelEs: 'Flete FCL', valueClp: result.totals.freightClp },
        { labelEs: 'Seguro', valueClp: result.totals.insuranceClp },
        { labelEs: 'CIF', valueClp: result.totals.cifClp },
        { labelEs: 'Arancel', valueClp: result.totals.dutyClp },
        { labelEs: 'Agente de aduanas y gastos en Chile', valueClp: result.totals.chileClp },
        { labelEs: 'Costo puesto en Chile', valueClp: result.totals.costClp },
      ]
    : []

  const sensitivityColumns = [
    { id: 'label', label: 'Si…', render: (s) => s.labelEs },
    {
      id: 'cost',
      label: 'Costo puesto en Chile',
      align: 'right',
      render: (s) => (s.costClp == null ? '—' : red(formatClp(s.costClp))),
    },
    {
      id: 'profit',
      label: 'Utilidad',
      align: 'right',
      render: (s) => (s.profitClp == null ? '—' : red(formatClpMillions(s.profitClp))),
    },
  ]

  const downloadPurchaseCsv = () => {
    downloadCsv(
      `carga-completa-${option}.csv`,
      [
        'Repuesto',
        'Proveedor',
        'Calidad',
        'Cantidad',
        'Costo FCL (CLP)',
        'PVP neto (CLP)',
        'Precio REF (CLP)',
        'Tramo',
      ],
      purchase.map((i) => [
        i.name,
        abbr(i.supplierId),
        i.quality,
        i.qty,
        Math.round(i.unitCostClp),
        Math.round(i.sale.priceClp),
        i.unitBaselineClp == null ? '' : Math.round(i.unitBaselineClp),
        i.sale.tier ? TIER_LABELS_ES[i.sale.tier] : '',
      ]),
    )
  }

  return (
    <ContentWidth>
      <PageHeader
        title="Carga completa"
        actions={<InfoNote title="Cómo se calcula" paragraphs={headerNotes} />}
      />

      <SectionPanel>
        <ViewTabs value={tab} onChange={setTab} tabs={TAB_LIST} />

        {tab === FULL_SHIPMENT_TABS.PLAN ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Toolbar>
              <ToolbarSelectBox
                label="Contenedor"
                value={mode}
                onChange={setMode}
                options={CONTAINER_OPTIONS}
              />
              <ToolbarSelectBox
                label="Proveedores"
                value={supplierMode}
                onChange={setSupplierMode}
                options={SUPPLIER_MODE_OPTIONS}
              />
            </Toolbar>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
                gap: 1.5,
              }}
            >
              {SHIPMENT_OPTIONS.map((opt) => {
                const r = data.results[opt]
                if (!r.items.length) {
                  return (
                    <Card key={opt} sx={{ p: 2 }}>
                      <Typography variant="overline" color="text.secondary">
                        Opción {SHIPMENT_OPTION_LABELS_ES[opt]}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Sin oferta costeable:{' '}
                        {r.blockers.join(', ') || 'faltan cotizaciones con incoterm.'}
                      </Typography>
                    </Card>
                  )
                }
                return (
                  <Card key={opt} sx={{ p: 2 }}>
                    <Typography variant="overline" color="text.secondary">
                      Opción {SHIPMENT_OPTION_LABELS_ES[opt]}
                    </Typography>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {r.supplierIds.map((id) => abbr(id)).join(' + ')}
                    </Typography>
                    <InfoGrid columns={3}>
                      <InfoField label="Repuestos">
                        {r.coveredCount} de {data.partCount}
                      </InfoField>
                      <InfoField label="Unidades">{r.units.toLocaleString('es-CL')}</InfoField>
                      <InfoField label="Contenedores">{r.containers}</InfoField>
                    </InfoGrid>
                    <Box sx={{ mt: 2 }}>
                      <InfoGrid columns={3}>
                        <InfoField
                          label="Flete FCL"
                          hint="Flete × los contenedores que alcanzan para todo el pedido."
                        >
                          {red(formatClp(r.totals.freightClp))}
                        </InfoField>
                        <InfoField
                          label="Arancel + agente"
                          hint="Arancel más gastos locales (agente de aduanas, almacenaje)."
                        >
                          {red(formatClp(r.totals.dutyClp + r.totals.chileClp))}
                        </InfoField>
                        <InfoField label="Costo puesto en Chile">
                          {red(formatClp(r.totals.costClp))}
                        </InfoField>
                      </InfoGrid>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                      <InfoGrid columns={3}>
                        <InfoField label="Precio REF">{formatClp(r.baselineClp)}</InfoField>
                        <InfoField label="PVP neto">{red(formatClp(r.saleClp))}</InfoField>
                        <InfoField label="Utilidad">
                          {red(formatClpMillions(r.profitClp))}
                        </InfoField>
                      </InfoGrid>
                    </Box>
                  </Card>
                )
              })}
            </Box>
          </Box>
        ) : null}

        {tab === FULL_SHIPMENT_TABS.PURCHASE ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Toolbar>
              <ToolbarSelectBox
                label="Contenedor"
                value={mode}
                onChange={setMode}
                options={CONTAINER_OPTIONS}
              />
              <ToolbarSelectBox
                label="Opción"
                value={option}
                onChange={setOption}
                options={SHIPMENT_OPTIONS.map((o) => ({
                  value: o,
                  label: SHIPMENT_OPTION_LABELS_ES[o],
                }))}
              />
              <ToolbarSelectBox
                label="Proveedores"
                value={supplierMode}
                onChange={setSupplierMode}
                options={SUPPLIER_MODE_OPTIONS}
              />
              <ToolbarButton
                label="Descargar CSV"
                onClick={downloadPurchaseCsv}
                disabled={!purchase.length}
              />
            </Toolbar>
            <ListTable
              sortKey="full-shipment-purchase"
              searchFields={(i) => [i.name, abbr(i.supplierId), i.quality]}
              searchPlaceholder="Buscar por repuesto, proveedor o calidad…"
              columns={purchaseColumns}
              rows={purchase}
              getRowKey={(i) => i.partId}
              emptyText="Sin repuestos costeables en esta opción."
            />
          </Box>
        ) : null}

        {tab === FULL_SHIPMENT_TABS.CALCULATION ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Toolbar>
              <ToolbarSelectBox
                label="Contenedor"
                value={mode}
                onChange={setMode}
                options={CONTAINER_OPTIONS}
              />
              <ToolbarSelectBox
                label="Opción"
                value={option}
                onChange={setOption}
                options={SHIPMENT_OPTIONS.map((o) => ({
                  value: o,
                  label: SHIPMENT_OPTION_LABELS_ES[o],
                }))}
              />
              <ToolbarSelectBox
                label="Proveedores"
                value={supplierMode}
                onChange={setSupplierMode}
                options={SUPPLIER_MODE_OPTIONS}
              />
            </Toolbar>
            {result.items.length ? (
              <ListTable
                columns={calcColumns}
                rows={calcRows}
                getRowKey={(r) => r.labelEs}
                emptyText="Sin cálculo."
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Sin oferta costeable en esta opción.
              </Typography>
            )}
          </Box>
        ) : null}

        {tab === FULL_SHIPMENT_TABS.SENSITIVITY ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              Cómo cambia el costo puesto en Chile y la utilidad de la opción &quot;Más barato&quot;
              si el flete por contenedor sale distinto al de referencia — el supuesto más volátil
              del cálculo.
            </Typography>
            <ListTable
              columns={sensitivityColumns}
              rows={data.freightScenarios}
              getRowKey={(s) => s.key}
            />
          </Box>
        ) : null}

        {tab === FULL_SHIPMENT_TABS.ANOMALIES ? (
          <AnomalyGroups anomalies={data.anomalies} suppliers={data.suppliers} />
        ) : null}
      </SectionPanel>
    </ContentWidth>
  )
}
