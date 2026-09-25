'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import ToolbarSearch from '@components/common/ToolbarSearch'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import ToolbarButton from '@components/common/ToolbarButton'
import ViewTabs from '@components/common/ViewTabs'
import InfoNote from '@components/common/InfoNote'
import TotalValue from './components/TotalValue'
import UncertainValue from '@components/common/UncertainValue'
import { ErrorState } from '@components/common/AsyncState'
import { ListPageSkeleton } from '@components/common/Skeletons'
import { useUrlTab } from '@hooks/useUrlTab'
import { CLIENT_ORDER_STATUS_LABELS_ES, PURCHASE_ORDER_STATUS_LABELS_ES } from '@constants/enums'
import { supplierLabel } from '@features/quotes/constants'
import ClientOrderDialog from './components/ClientOrderDialog'
import PurchaseOrderDialog from './components/PurchaseOrderDialog'
import MarginValue from './components/MarginValue'
import { useOrders } from './hooks/useOrders'
import {
  ALL_STATUSES,
  CLIENT_ORDER_HELP,
  CLIENT_STATUS_OPTIONS,
  COVERAGE_LABELS_ES,
  ORDER_VIEWS,
  ORDER_VIEW_TABS,
  PURCHASE_ORDER_HELP,
  PURCHASE_STATUS_OPTIONS,
  formatIsoDate,
  orderLabel,
} from './constants'

const normalize = (s) => (s ?? '').toString().toLowerCase()

const CLIENT_COLUMNS = [
  { id: 'number', label: 'OC', render: ({ order }) => orderLabel(order) },
  { id: 'client', label: 'Cliente', width: 180, render: ({ client }) => client?.name ?? '—' },
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
    render: (row) => <TotalValue {...row} />,
  },
  {
    id: 'coverage',
    label: 'Cubierto',
    width: 110,
    align: 'right',
    tooltip: 'Unidades pedidas que ya tienen una compra a proveedor enlazada.',
    render: ({ coverage }) =>
      coverage.orderedQty > 0
        ? `${coverage.coveredQty} de ${coverage.orderedQty} u`
        : COVERAGE_LABELS_ES[coverage.status],
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

const PURCHASE_COLUMNS = [
  { id: 'number', label: 'OC', render: ({ order }) => orderLabel(order) },
  {
    id: 'supplier',
    label: 'Proveedor',
    width: 150,
    render: ({ order, supplier }) => (
      <span title={supplier?.name}>{supplierLabel(supplier, order.supplierId)}</span>
    ),
  },
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
    render: ({ order }) => PURCHASE_ORDER_STATUS_LABELS_ES[order.status] ?? order.status,
  },
  {
    id: 'incoterm',
    label: 'Incoterm',
    width: 120,
    render: ({ order }) =>
      order.incoterm ? (
        [order.incoterm, order.incotermPlace].filter(Boolean).join(' ')
      ) : (
        <UncertainValue verified={false} reason="La OC no indica Incoterm">
          Sin definir
        </UncertainValue>
      ),
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
    label: 'Total',
    width: 120,
    align: 'right',
    render: (row) => <TotalValue {...row} />,
  },
  {
    id: 'clientOrders',
    label: 'Pedidos',
    width: 150,
    tooltip: 'OC de clientes que cubre esta compra.',
    render: ({ clientOrders }) => clientOrders.map(orderLabel).join(', ') || '—',
  },
]

export default function OrdersPage() {
  const router = useRouter()
  const data = useOrders()
  const [view, setView] = useUrlTab(Object.values(ORDER_VIEWS))
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(ALL_STATUSES)
  const [creating, setCreating] = useState(false)
  const isClients = view === ORDER_VIEWS.CLIENTS
  const term = normalize(search.trim())

  const changeView = (next) => {
    setView(next)
    setStatus(ALL_STATUSES)
  }

  const clientRows = useMemo(
    () =>
      data.clientOrderRows.filter(
        ({ order, client }) =>
          (status === ALL_STATUSES || order.status === status) &&
          (!term ||
            normalize(order.number).includes(term) ||
            normalize(client?.name).includes(term)),
      ),
    [data.clientOrderRows, status, term],
  )
  const purchaseRows = useMemo(
    () =>
      data.purchaseOrderRows.filter(
        ({ order, supplier }) =>
          (status === ALL_STATUSES || order.status === status) &&
          (!term ||
            normalize(order.number).includes(term) ||
            normalize(supplier?.name).includes(term) ||
            normalize(supplier?.alias).includes(term)),
      ),
    [data.purchaseOrderRows, status, term],
  )

  if (data.loading) {
    return (
      <ContentWidth>
        <ListPageSkeleton />
      </ContentWidth>
    )
  }
  if (data.error) {
    return (
      <ContentWidth>
        <ErrorState />
      </ContentWidth>
    )
  }

  const shown = isClients ? clientRows.length : purchaseRows.length
  const total = isClients ? data.clientOrderRows.length : data.purchaseOrderRows.length
  const statusOptions = [
    { value: ALL_STATUSES, label: 'Todos los estados' },
    ...(isClients ? CLIENT_STATUS_OPTIONS : PURCHASE_STATUS_OPTIONS),
  ]

  return (
    <ContentWidth>
      <PageHeader title="Órdenes de compra" meta={`${shown} de ${total} órdenes.`} />
      <ViewTabs value={view} onChange={changeView} tabs={ORDER_VIEW_TABS} />

      {creating && isClients ? (
        <ClientOrderDialog
          clients={data.clients}
          onClose={() => setCreating(false)}
          onSaved={async (id) => {
            await data.reload()
            router.push(`/client-orders/${id}`)
          }}
        />
      ) : null}
      {creating && !isClients ? (
        <PurchaseOrderDialog
          suppliers={data.suppliers}
          quotations={data.quotations}
          onClose={() => setCreating(false)}
          onSaved={async (id) => {
            await data.reload()
            router.push(`/purchase-orders/${id}`)
          }}
        />
      ) : null}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
        <ToolbarSearch
          value={search}
          onChange={setSearch}
          placeholder={isClients ? 'Buscar por OC o cliente…' : 'Buscar por OC o proveedor…'}
        />
        <ToolbarSelectBox
          label="Estado"
          value={status}
          onChange={setStatus}
          options={statusOptions}
        />
        <ToolbarButton label="Nueva OC" onClick={() => setCreating(true)} />
        <InfoNote
          title="Cómo leer esta lista"
          paragraphs={isClients ? CLIENT_ORDER_HELP : PURCHASE_ORDER_HELP}
        />
      </Box>

      {isClients ? (
        <ListTable
          columns={CLIENT_COLUMNS}
          rows={clientRows}
          getRowKey={({ order }) => order.id}
          getRowHref={({ order }) => `/client-orders/${order.id}`}
          emptyText="Sin OC de clientes todavía."
        />
      ) : (
        <ListTable
          columns={PURCHASE_COLUMNS}
          rows={purchaseRows}
          getRowKey={({ order }) => order.id}
          getRowHref={({ order }) => `/purchase-orders/${order.id}`}
          emptyText="Sin OC a proveedores todavía."
        />
      )}
    </ContentWidth>
  )
}
