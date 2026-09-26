'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import { useRouteId } from '@hooks/useRouteId'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import ViewTabs from '@components/common/ViewTabs'
import UncertainValue from '@components/common/UncertainValue'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { VEHICLE_IMAGE_WIDTH } from '@constants/layout'
import { useUrlTab } from '@hooks/useUrlTab'
import { formatDate, supplierLabel } from '@features/quotes/constants'
import QualityChips from '@features/quotes/components/QualityChips'
import { TAB_LIST, VEHICLE_TABS, vehicleLabel } from './constants'
import { useVehicles } from './hooks/useVehicles'

export default function VehicleDetailPage() {
  const vehicleId = useRouteId()
  const { rows, loading, error } = useVehicles()
  const [tab, setTab] = useUrlTab(Object.values(VEHICLE_TABS))

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
  const row = rows.find((r) => r.vehicle.id === vehicleId)
  if (!row) {
    return (
      <ContentWidth>
        <PageHeader
          back={{ href: '/vehicles', label: 'Vehículos' }}
          title="Vehículo no encontrado"
        />
      </ContentWidth>
    )
  }
  const { vehicle, parts, quotations, quotedIds } = row

  const quoteColumns = [
    {
      id: 'supplier',
      label: 'Proveedor',
      render: (q) => (
        <span title={q.supplier?.name}>{supplierLabel(q.supplier, q.supplierId)}</span>
      ),
    },
    { id: 'file', label: 'Cotización', render: (q) => q.sourceFile ?? 'Sin archivo de origen' },
    { id: 'sells', label: 'Oferta', width: 130, render: (q) => <QualityChips quotation={q} /> },
    {
      id: 'incoterm',
      label: 'Incoterm',
      width: 90,
      render: (q) => (
        <UncertainValue verified={q.incotermConfirmed} reason="Incoterm sin confirmar">
          {q.incoterms.join(', ') || 'Sin definir'}
        </UncertainValue>
      ),
    },
    {
      id: 'parts',
      label: 'Repuestos',
      width: 90,
      align: 'right',
      tooltip: 'Repuestos de este vehículo en la cotización.',
      render: (q) => q.partCount,
    },
    { id: 'date', label: 'Fecha', width: 100, render: (q) => formatDate(q.capturedAt) },
  ]

  const partColumns = [
    { id: 'name', label: 'Repuesto', render: (p) => p.nameEs },
    {
      id: 'code',
      label: 'Código',
      width: 130,
      render: (p) => (
        <UncertainValue
          verified={Boolean(p.code) && p.codeStatus === 'confirmed'}
          reason={p.code ? 'Código sin confirmar' : 'Sin código'}
        >
          {p.code ?? 'Sin código'}
        </UncertainValue>
      ),
    },
    { id: 'category', label: 'Categoría', width: 160, render: (p) => p.category?.labelEs ?? '—' },
    {
      id: 'quoted',
      label: 'Cotizado',
      width: 90,
      render: (p) => (
        <UncertainValue verified={quotedIds.has(p.id)} reason="Ningún proveedor lo cotizó">
          {quotedIds.has(p.id) ? 'Sí' : 'No'}
        </UncertainValue>
      ),
    },
  ]

  return (
    <ContentWidth>
      <PageHeader
        back={{ href: '/vehicles', label: 'Vehículos' }}
        title={vehicleLabel(vehicle)}
        description={vehicle.model}
      />

      <Card sx={{ p: 2, mb: 1.5, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Box
          sx={{
            width: VEHICLE_IMAGE_WIDTH,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {vehicle.imageUrl ? (
            <Box
              component="img"
              src={vehicle.imageUrl}
              alt={vehicleLabel(vehicle)}
              title={vehicle.imageSource ?? undefined}
              sx={{ width: '100%', objectFit: 'contain' }}
            />
          ) : (
            <Typography variant="caption" color="error.main">
              Sin imagen
            </Typography>
          )}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <InfoGrid columns={5}>
            <InfoField label="Marca" divided>
              {vehicle.brand ?? '—'}
            </InfoField>
            <InfoField label="Origen">{vehicle.origin ?? '—'}</InfoField>
            <InfoField label="Año">{vehicle.year ?? '—'}</InfoField>
            <InfoField label="Repuestos">{parts.length}</InfoField>
            <InfoField label="Cotizados">{quotedIds.size}</InfoField>
          </InfoGrid>
        </Box>
      </Card>

      <ViewTabs value={tab} onChange={setTab} tabs={TAB_LIST} />

      {tab === VEHICLE_TABS.QUOTES ? (
        <ListTable
          columns={quoteColumns}
          rows={quotations}
          getRowKey={(q) => q.id}
          getRowHref={(q) => `/quotes/${q.id}`}
          emptyText="Ningún proveedor ha cotizado repuestos de este vehículo."
        />
      ) : null}

      {tab === VEHICLE_TABS.PARTS ? (
        <ListTable
          columns={partColumns}
          rows={parts}
          getRowKey={(p) => p.id}
          getRowHref={(p) => `/parts/${p.id}`}
          emptyText="Sin repuestos cargados para este vehículo."
        />
      ) : null}
    </ContentWidth>
  )
}
