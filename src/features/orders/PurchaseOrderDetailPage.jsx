'use client'

import { useState } from 'react'
import Link from 'next/link'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import { useRouteId } from '@hooks/useRouteId'
import { useUrlTab } from '@hooks/useUrlTab'
import ContentWidth from '@components/common/ContentWidth'
import PageHeader from '@components/common/PageHeader'
import ListTable from '@components/common/ListTable'
import ViewTabs from '@components/common/ViewTabs'
import ToolbarButton from '@components/common/ToolbarButton'
import InfoNote from '@components/common/InfoNote'
import MoneyValue from '@components/common/MoneyValue'
import UncertainValue from '@components/common/UncertainValue'
import { InfoGrid, InfoField } from '@components/common/InfoGrid'
import { ErrorState } from '@components/common/AsyncState'
import { DetailPageSkeleton } from '@components/common/Skeletons'
import { PURCHASE_ORDER_STATUS_LABELS_ES } from '@constants/enums'
import { multiplyMoney } from '@libs/money'
import { deletePurchaseOrderLine } from '@libs/repos/purchaseOrdersRepo'
import { supplierLabel } from '@features/quotes/constants'
import DeleteLineDialog from './components/DeleteLineDialog'
import PurchaseOrderDialog from './components/PurchaseOrderDialog'
import PurchaseOrderLineDialog from './components/PurchaseOrderLineDialog'
import RowActions from './components/RowActions'
import TotalValue from './components/TotalValue'
import { useOrders } from './hooks/useOrders'
import {
  PURCHASE_ORDER_HELP,
  PURCHASE_ORDER_TABS,
  PURCHASE_ORDER_TAB_LIST,
  formatIsoDate,
  orderLabel,
  partLabel,
} from './constants'

const BACK = { href: '/orders?tab=proveedores', label: 'Órdenes' }

export default function PurchaseOrderDetailPage() {
  const orderId = useRouteId()
  const data = useOrders()
  const [tab, setTab] = useUrlTab(Object.values(PURCHASE_ORDER_TABS))
  // { kind: 'order' } | { kind: 'line', line? } | { kind: 'delete', line }
  const [editing, setEditing] = useState(null)

  if (data.loading) {
    return (
      <ContentWidth>
        <DetailPageSkeleton />
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
  const row = data.purchaseOrderRows.find((r) => r.order.id === orderId)
  if (!row) {
    return (
      <ContentWidth>
        <PageHeader back={BACK} title="OC no encontrada" />
      </ContentWidth>
    )
  }
  const { order, supplier, quotation } = row
  const close = () => setEditing(null)
  const reload = () => data.reload()
  const editOrder = () => setEditing({ kind: 'order' })
  const clientOrdersById = new Map(data.clientOrders.map((o) => [o.id, o]))

  const columns = [
    {
      id: 'part',
      label: 'Repuesto',
      sortValue: (l) => partLabel(data.partsById.get(l.partId)),
      render: (l) => {
        const part = data.partsById.get(l.partId)
        return part ? (
          <Box component={Link} href={`/parts/${part.id}`} sx={{ color: 'inherit' }}>
            {partLabel(part)}
          </Box>
        ) : (
          partLabel(null)
        )
      },
    },
    {
      id: 'qty',
      label: 'Cantidad',
      sortValue: (l) => l.qty,
      width: 80,
      align: 'right',
      render: (l) => `${l.qty} u`,
    },
    {
      id: 'price',
      label: 'Precio unitario',
      sortValue: (l) => l.unitPrice?.amount,
      width: 120,
      align: 'right',
      tooltip: 'De la cotización o ingresado a mano.',
      render: (l) =>
        l.unitPrice ? (
          <MoneyValue money={l.unitPrice} />
        ) : (
          <UncertainValue verified={false} reason="Precio sin definir">
            Sin precio
          </UncertainValue>
        ),
    },
    {
      id: 'total',
      label: 'Total',
      sortValue: (l) => (l.unitPrice ? l.unitPrice.amount * l.qty : null),
      width: 120,
      align: 'right',
      render: (l) => (l.unitPrice ? <MoneyValue money={multiplyMoney(l.unitPrice, l.qty)} /> : '—'),
    },
    {
      id: 'orders',
      label: 'Pedidos',
      width: 200,
      tooltip: 'OC de clientes que cubre esta línea y cuántas unidades a cada una.',
      render: (l) =>
        l.clientOrderLinks
          .map((k) => `${orderLabel(clientOrdersById.get(k.clientOrderId))} · ${k.qty} u`)
          .join(', ') || '—',
    },
    {
      id: 'actions',
      label: '',
      width: 72,
      align: 'right',
      render: (l) => (
        <RowActions
          onEdit={() => setEditing({ kind: 'line', line: l })}
          onDelete={() => setEditing({ kind: 'delete', line: l })}
        />
      ),
    },
  ]

  return (
    <ContentWidth>
      <PageHeader
        back={BACK}
        title={orderLabel(order)}
        description={supplierLabel(supplier, order.supplierId)}
      />

      {editing?.kind === 'order' ? (
        <PurchaseOrderDialog
          order={order}
          suppliers={data.suppliers}
          quotations={data.quotations}
          onClose={close}
          onSaved={reload}
        />
      ) : null}
      {editing?.kind === 'line' ? (
        <PurchaseOrderLineDialog
          order={order}
          line={editing.line}
          parts={data.parts}
          quotation={quotation}
          clientOrders={data.openClientOrders}
          purchaseOrders={data.purchaseOrders}
          clientsById={data.clientsById}
          onClose={close}
          onSaved={reload}
        />
      ) : null}
      {editing?.kind === 'delete' ? (
        <DeleteLineDialog
          label={partLabel(data.partsById.get(editing.line.partId))}
          onClose={close}
          onDelete={async () => {
            await deletePurchaseOrderLine(order.id, editing.line.id)
            await reload()
          }}
        />
      ) : null}

      <Card sx={{ p: 2, mb: 1.5 }}>
        <InfoGrid columns={6}>
          <InfoField label="Proveedor">
            <Box component={Link} href={`/suppliers/${order.supplierId}`} sx={{ color: 'inherit' }}>
              {supplierLabel(supplier, order.supplierId)}
            </Box>
          </InfoField>
          <InfoField label="Cotización" onEdit={editOrder}>
            {quotation ? (
              <Box component={Link} href={`/quotes/${quotation.id}`} sx={{ color: 'inherit' }}>
                {quotation.sourceFile ?? 'Ver cotización'}
              </Box>
            ) : (
              'Sin cotización'
            )}
          </InfoField>
          <InfoField label="Fecha" onEdit={editOrder}>
            {order.date ? formatIsoDate(order.date) : 'Sin fecha'}
          </InfoField>
          <InfoField label="Estado" onEdit={editOrder}>
            {PURCHASE_ORDER_STATUS_LABELS_ES[order.status] ?? order.status}
          </InfoField>
          <InfoField label="Incoterm" onEdit={editOrder}>
            {order.incoterm ? (
              [order.incoterm, order.incotermPlace].filter(Boolean).join(' ')
            ) : (
              <UncertainValue verified={false} reason="La OC no indica Incoterm">
                Sin definir
              </UncertainValue>
            )}
          </InfoField>
          <InfoField label="Total">
            <TotalValue total={row.total} missingPrice={row.missingPrice} />
          </InfoField>
        </InfoGrid>
      </Card>

      <ViewTabs value={tab} onChange={setTab} tabs={PURCHASE_ORDER_TAB_LIST} />

      {tab === PURCHASE_ORDER_TABS.LINES ? (
        <>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
            <ToolbarButton label="Agregar línea" onClick={() => setEditing({ kind: 'line' })} />
            <InfoNote title="Cómo se enlaza" paragraphs={PURCHASE_ORDER_HELP} />
          </Box>
          <ListTable
            sortKey="purchase-order-lines"
            searchFields={(l) => [partLabel(data.partsById.get(l.partId))]}
            searchPlaceholder="Buscar por repuesto…"
            columns={columns}
            rows={order.lines}
            getRowKey={(l) => l.id}
            emptyText="Sin líneas: agrega los repuestos que se compran a este proveedor."
          />
        </>
      ) : null}

      {tab === PURCHASE_ORDER_TABS.DATA ? (
        <Card sx={{ p: 2 }}>
          <InfoGrid columns={3}>
            <InfoField label="N.º OC" onEdit={editOrder}>
              {order.number ?? (
                <UncertainValue verified={false} reason="La OC no tiene número">
                  Sin dato
                </UncertainValue>
              )}
            </InfoField>
            <InfoField label="Moneda" onEdit={editOrder}>
              {order.currency}
            </InfoField>
            <InfoField label="Notas" onEdit={editOrder}>
              {order.notes ?? '—'}
            </InfoField>
          </InfoGrid>
        </Card>
      ) : null}
    </ContentWidth>
  )
}
