'use client'

import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import { ErrorState } from '@components/common/AsyncState'
import { ListPageSkeleton } from '@components/common/Skeletons'
import { vehicleLabel } from './constants'
import { useVehicles } from './hooks/useVehicles'

const COLUMNS = [
  { id: 'vehicle', label: 'Vehículo', render: ({ vehicle }) => vehicleLabel(vehicle) },
  { id: 'origin', label: 'Origen', width: 90, render: ({ vehicle }) => vehicle.origin ?? '—' },
  { id: 'year', label: 'Año', width: 70, render: ({ vehicle }) => vehicle.year ?? '—' },
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
