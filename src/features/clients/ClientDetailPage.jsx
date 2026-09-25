'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import { useRouteId } from '@hooks/useRouteId'
import { useUrlTab } from '@hooks/useUrlTab'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import ViewTabs from '@components/common/ViewTabs'
import ToolbarButton from '@components/common/ToolbarButton'
import UncertainValue from '@components/common/UncertainValue'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { CLIENT_ORDER_STATUS_LABELS_ES } from '@constants/enums'
import ClientOrderDialog from '@features/orders/components/ClientOrderDialog'
import MarginValue from '@features/orders/components/MarginValue'
import TotalValue from '@features/orders/components/TotalValue'
import { formatIsoDate, orderLabel } from '@features/orders/constants'
import ClientDialog from './components/ClientDialog'
import { CLIENT_TABS, CLIENT_TAB_LIST } from './constants'
import { useClients } from './hooks/useClients'

const missing = (reason) => (
  <UncertainValue verified={false} reason={reason}>
    Sin dato
  </UncertainValue>
)

const ORDER_COLUMNS = [
  { id: 'number', label: 'OC', render: ({ order }) => orderLabel(order) },
  {
    id: 'date',
    label: 'Fecha',
    width: 100,
    render: ({ order }) => (order.date ? formatIsoDate(order.date) : '—'),
  },
  {
    id: 'status',
    label: 'Estado',
    width: 100,
    render: ({ order }) => CLIENT_ORDER_STATUS_LABELS_ES[order.status] ?? order.status,
  },
  {
    id: 'lines',
    label: 'Líneas',
    width: 70,
    align: 'right',
    render: ({ order }) => order.lines.length,
  },
  {
    id: 'total',
    label: 'Venta',
    width: 120,
    align: 'right',
    render: ({ total, missingPrice }) => <TotalValue total={total} missingPrice={missingPrice} />,
  },
  {
    id: 'coverage',
    label: 'Cubierto',
    width: 100,
    align: 'right',
    render: ({ coverage }) => `${coverage.coveredQty} de ${coverage.orderedQty} u`,
  },
  {
    id: 'margin',
    label: 'Margen estimado',
    width: 150,
    align: 'right',
    render: ({ coverage }) => (
      <MarginValue margin={coverage.margin} converted={coverage.converted} />
    ),
  },
]

export default function ClientDetailPage() {
  const clientId = useRouteId()
  const router = useRouter()
  const { rows, clients, loading, error, reload } = useClients()
  const [tab, setTab] = useUrlTab(Object.values(CLIENT_TABS))
  // 'client' | 'order' | null
  const [editing, setEditing] = useState(null)

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
  const row = rows.find((r) => r.client.id === clientId)
  if (!row) {
    return (
      <ContentWidth>
        <PageHeader back={{ href: '/clients', label: 'Clientes' }} title="Cliente no encontrado" />
      </ContentWidth>
    )
  }
  const { client, orders, openCount } = row
  const close = () => setEditing(null)
  const editClient = () => setEditing('client')

  return (
    <ContentWidth>
      <PageHeader
        back={{ href: '/clients', label: 'Clientes' }}
        title={client.name}
        description={client.rut ?? undefined}
      />

      {editing === 'client' ? (
        <ClientDialog client={client} onClose={close} onSaved={() => reload()} />
      ) : null}
      {editing === 'order' ? (
        <ClientOrderDialog
          clients={clients}
          clientId={client.id}
          onClose={close}
          onSaved={async (id) => {
            await reload()
            router.push(`/client-orders/${id}`)
          }}
        />
      ) : null}

      <Card sx={{ p: 2, mb: 1.5 }}>
        <InfoGrid columns={5}>
          <InfoField label="RUT" onEdit={editClient}>
            {client.rut ?? missing('RUT sin registrar')}
          </InfoField>
          <InfoField label="Contacto" onEdit={editClient}>
            {client.contact.person ?? missing('Contacto sin registrar')}
          </InfoField>
          <InfoField label="Correo" onEdit={editClient}>
            {client.contact.email ?? missing('Correo sin registrar')}
          </InfoField>
          <InfoField label="OC">{orders.length}</InfoField>
          <InfoField label="Vigentes">{openCount}</InfoField>
        </InfoGrid>
      </Card>

      <ViewTabs value={tab} onChange={setTab} tabs={CLIENT_TAB_LIST} />

      {tab === CLIENT_TABS.ORDERS ? (
        <>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
            <ToolbarButton label="Nueva OC" onClick={() => setEditing('order')} />
          </Box>
          <ListTable
            columns={ORDER_COLUMNS}
            rows={orders}
            getRowKey={({ order }) => order.id}
            getRowHref={({ order }) => `/client-orders/${order.id}`}
            emptyText="Sin OC de este cliente todavía."
          />
        </>
      ) : null}

      {tab === CLIENT_TABS.DATA ? (
        <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <InfoGrid columns={3}>
            <InfoField label="Razón social" onEdit={editClient}>
              {client.name}
            </InfoField>
            <InfoField label="RUT" onEdit={editClient}>
              {client.rut ?? missing('RUT sin registrar')}
            </InfoField>
            <InfoField label="Teléfono" onEdit={editClient}>
              {client.contact.phone ?? missing('Teléfono sin registrar')}
            </InfoField>
          </InfoGrid>
          <InfoGrid columns={3}>
            <InfoField label="Contacto" onEdit={editClient}>
              {client.contact.person ?? missing('Contacto sin registrar')}
            </InfoField>
            <InfoField label="Correo" onEdit={editClient}>
              {client.contact.email ?? missing('Correo sin registrar')}
            </InfoField>
            <InfoField label="Notas" onEdit={editClient}>
              {client.notes ?? '—'}
            </InfoField>
          </InfoGrid>
        </Card>
      ) : null}
    </ContentWidth>
  )
}
