'use client'

import Box from '@mui/material/Box'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import { ErrorState } from '@components/common/AsyncState'
import { ListPageSkeleton } from '@components/common/Skeletons'
import { VEHICLE_THUMB_WIDTH } from '@constants/layout'
import { vehicleLabel } from './constants'
import { useVehicles } from './hooks/useVehicles'

const COLUMNS = [
  {
    id: 'image',
    label: '',
    width: VEHICLE_THUMB_WIDTH,
    render: ({ vehicle }) =>
      vehicle.imageUrl ? (
        <Box
          component="img"
          src={vehicle.imageUrl}
          alt={vehicleLabel(vehicle)}
          sx={{ display: 'block', width: '100%', height: 32, objectFit: 'contain' }}
        />
      ) : null,
  },
  { id: 'vehicle', label: 'Vehículo', render: ({ vehicle }) => vehicleLabel(vehicle) },
  { id: 'origin', label: 'Origen', width: 90, render: ({ vehicle }) => vehicle.origin ?? '—' },
  { id: 'year', label: 'Año', width: 70, render: ({ vehicle }) => vehicle.year ?? '—' },
  {
    id: 'fleet',
    label: 'Flota',
    width: 80,
    align: 'right',
    render: ({ vehicle }) => vehicle.fleetSize ?? '—',
  },
  { id: 'parts', label: 'Repuestos', width: 90, align: 'right', render: (r) => r.parts.length },
  {
    id: 'quoted',
    label: 'Cotizados',
    width: 90,
    align: 'right',
    tooltip: 'Repuestos con al menos una cotización.',
    render: (r) => r.quotedIds.size,
  },
  {
    id: 'quotes',
    label: 'Cotizaciones',
    width: 100,
    align: 'right',
    render: (r) => r.quotations.length,
  },
  {
    id: 'suppliers',
    label: 'Proveedores',
    width: 100,
    align: 'right',
    render: (r) => r.supplierCount,
  },
]

export default function VehiclesPage() {
  const { rows, loading, error } = useVehicles()

  if (loading) {
    return (
      <ContentWidth>
        <ListPageSkeleton rows={4} />
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
      <PageHeader title="Vehículos" meta={`${rows.length} vehículos.`} />
      <ListTable
        columns={COLUMNS}
        rows={rows}
        getRowKey={({ vehicle }) => vehicle.id}
        getRowHref={({ vehicle }) => `/vehicles/${vehicle.id}`}
        emptyText="Sin vehículos cargados todavía."
      />
    </ContentWidth>
  )
}
