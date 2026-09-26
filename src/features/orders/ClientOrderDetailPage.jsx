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
import { CLIENT_ORDER_STATUS_LABELS_ES, PURCHASE_ORDER_STATUS_LABELS_ES } from '@constants/enums'
import { multiplyMoney } from '@libs/money'
import { deleteClientOrderLine } from '@libs/repos/clientOrdersRepo'
import { supplierLabel } from '@features/quotes/constants'
import ClientOrderDialog from './components/ClientOrderDialog'
import ClientOrderLineDialog from './components/ClientOrderLineDialog'
import ClientOrderSimulation from './components/ClientOrderSimulation'
import DeleteLineDialog from './components/DeleteLineDialog'
import MarginValue from './components/MarginValue'
import RowActions from './components/RowActions'
import TotalValue from './components/TotalValue'
import { isClientLineLinked } from './ordersModel'
import { useOrders } from './hooks/useOrders'
import {
  CLIENT_ORDER_HELP,
  CLIENT_ORDER_TABS,
  CLIENT_ORDER_TAB_LIST,
  COVERAGE_LABELS_ES,
  formatIsoDate,
  orderLabel,
  partLabel,
} from './constants'

const MISSING_PRICE = (
  <UncertainValue verified={false} reason="Precio de venta sin definir">
    Sin precio
  </UncertainValue>
)

export default function ClientOrderDetailPage() {
  const orderId = useRouteId()
  const data = useOrders()
  const [tab, setTab] = useUrlTab(Object.values(CLIENT_ORDER_TABS))
  // { kind: 'order' } | { kind: 'line', line? } | { kind: 'delete', line }
  const [editing, setEditing] = useState(null)
  // Simulación de compra abierta: reemplaza las pestañas hasta que se cierra o se crean las OC.
  const [simulating, setSimulating] = useState(false)

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
  const row = data.clientOrderRows.find((r) => r.order.id === orderId)
  if (!row) {
    return (
      <ContentWidth>
        <PageHeader back={{ href: '/orders', label: 'Órdenes' }} title="OC no encontrada" />
      </ContentWidth>
    )
  }
  const { order, client, coverage } = row
  const close = () => setEditing(null)
  const reload = () => data.reload()
  const editOrder = () => setEditing({ kind: 'order' })
  const coveredByLine = new Map(coverage.lines.map((c) => [c.line.id, c]))

  const lineColumns = [
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
      render: (l) => (l.unitPrice ? <MoneyValue money={l.unitPrice} /> : MISSING_PRICE),
    },
    {
      id: 'total',
      label: 'Total',
      sortValue: (l) => (l.unitPrice ? l.unitPrice.amount * l.qty : null),
      width: 120,
      align: 'right',
      render: (l) =>
        l.unitPrice ? <MoneyValue money={multiplyMoney(l.unitPrice, l.qty)} /> : MISSING_PRICE,
    },
    {
      id: 'covered',
      label: 'Cubierto',
      sortValue: (l) => coveredByLine.get(l.id)?.coveredQty ?? 0,
      width: 90,
      align: 'right',
      tooltip: 'Unidades con una compra a proveedor enlazada.',
      render: (l) => `${coveredByLine.get(l.id)?.coveredQty ?? 0} de ${l.qty}`,
    },
    {
      id: 'margin',
      label: 'Margen estimado',
      width: 150,
      align: 'right',
      render: (l) => {
        const c = coveredByLine.get(l.id)
        return (
          <MarginValue
            margin={c?.margin ?? null}
            converted={c?.converted}
            missingText={c?.coveredQty ? 'Falta un precio' : 'Sin compra'}
          />
        )
      },
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
          deleteBlocked={
            isClientLineLinked(l.id, data.purchaseOrders)
              ? 'Una compra cubre esta línea: primero quita el enlace en la OC a proveedor'
              : null
          }
        />
      ),
    },
  ]

  // Compras enlazadas a este pedido: una fila por enlace.
  const purchaseRows = coverage.lines.flatMap((c) =>
    c.links.map((link) => ({
      key: `${link.purchaseLine.id}-${c.line.id}`,
      purchaseOrder: link.purchaseOrder,
      purchaseLine: link.purchaseLine,
      clientLine: c.line,
      qty: link.qty,
    })),
  )
  const purchaseColumns = [
    {
      id: 'order',
      label: 'OC a proveedor',
      sortValue: (r) => orderLabel(r.purchaseOrder),
      render: (r) => orderLabel(r.purchaseOrder),
    },
    {
      id: 'supplier',
      label: 'Proveedor',
      width: 140,
      render: (r) =>
        supplierLabel(
          data.suppliersById.get(r.purchaseOrder.supplierId),
          r.purchaseOrder.supplierId,
        ),
    },
    {
      id: 'part',
      label: 'Repuesto',
      sortValue: (r) => partLabel(data.partsById.get(r.clientLine.partId)),
      width: 220,
      render: (r) => partLabel(data.partsById.get(r.clientLine.partId)),
    },
    {
      id: 'qty',
      label: 'Cantidad',
      sortValue: (r) => r.qty,
      width: 80,
      align: 'right',
      render: (r) => `${r.qty} u`,
    },
    {
      id: 'price',
      label: 'Precio proveedor',
      width: 140,
      align: 'right',
      tooltip: 'Precio unitario del proveedor con su Incoterm, no el costo puesto en Chile.',
      render: (r) =>
        r.purchaseLine.unitPrice ? (
          <UncertainValue
            verified={false}
            reason={`Precio ${r.purchaseOrder.incoterm ?? 'sin Incoterm'}, no costo puesto en Chile`}
          >
            <MoneyValue money={r.purchaseLine.unitPrice} />
          </UncertainValue>
        ) : (
          <UncertainValue verified={false} reason="La línea de compra no tiene precio">
            Sin precio
          </UncertainValue>
        ),
    },
    {
      id: 'status',
      label: 'Estado',
      sortValue: (r) => PURCHASE_ORDER_STATUS_LABELS_ES[r.purchaseOrder.status],
      width: 100,
      render: (r) => PURCHASE_ORDER_STATUS_LABELS_ES[r.purchaseOrder.status],
    },
  ]

  const editingLine = editing?.kind === 'line' ? editing.line : null
  const editingCovered = editingLine ? (coveredByLine.get(editingLine.id)?.coveredQty ?? 0) : 0

  return (
    <ContentWidth>
      <PageHeader
        back={{ href: '/orders', label: 'Órdenes' }}
        title={orderLabel(order)}
        description={client?.name}
        actions={
          <ToolbarButton
            label={simulating ? 'Cerrar simulación' : 'Simular compra'}
            onClick={() => setSimulating((on) => !on)}
          />
        }
      />

      {editing?.kind === 'order' ? (
        <ClientOrderDialog order={order} clients={data.clients} onClose={close} onSaved={reload} />
      ) : null}
      {editing?.kind === 'line' ? (
        <ClientOrderLineDialog
          order={order}
          line={editingLine ?? undefined}
          parts={data.parts}
          partLocked={
            Boolean(editingLine) && isClientLineLinked(editingLine.id, data.purchaseOrders)
          }
          minQty={editingCovered}
          onClose={close}
          onSaved={reload}
        />
      ) : null}
      {editing?.kind === 'delete' ? (
        <DeleteLineDialog
          label={partLabel(data.partsById.get(editing.line.partId))}
          onClose={close}
          onDelete={async () => {
            await deleteClientOrderLine(order.id, editing.line.id)
            await reload()
          }}
        />
      ) : null}

      <Card sx={{ p: 2, mb: 1.5 }}>
        <InfoGrid columns={6}>
          <InfoField label="Cliente">
            {client ? (
              <Box component={Link} href={`/clients/${client.id}`} sx={{ color: 'inherit' }}>
                {client.name}
              </Box>
            ) : (
              '—'
            )}
          </InfoField>
          <InfoField label="Fecha" onEdit={editOrder}>
            {order.date ? formatIsoDate(order.date) : 'Sin fecha'}
          </InfoField>
          <InfoField label="Estado" onEdit={editOrder}>
            {CLIENT_ORDER_STATUS_LABELS_ES[order.status] ?? order.status}
          </InfoField>
          <InfoField label="Venta">
            <TotalValue total={row.total} missingPrice={row.missingPrice} />
          </InfoField>
          <InfoField label="Cubierto">
            {coverage.orderedQty > 0
              ? `${coverage.coveredQty} de ${coverage.orderedQty} u`
              : COVERAGE_LABELS_ES[coverage.status]}
          </InfoField>
          <InfoField label="Margen estimado">
            <MarginValue margin={coverage.margin} converted={coverage.converted} />
          </InfoField>
        </InfoGrid>
      </Card>

      {simulating ? (
        <ClientOrderSimulation
          order={order}
          purchaseOrders={data.purchaseOrders}
          partsById={data.partsById}
          onCreated={async () => {
            setSimulating(false)
            setTab(CLIENT_ORDER_TABS.PURCHASES)
            await data.reload()
          }}
        />
      ) : (
        <ViewTabs value={tab} onChange={setTab} tabs={CLIENT_ORDER_TAB_LIST} />
      )}

      {!simulating && tab === CLIENT_ORDER_TABS.LINES ? (
        <>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
            <ToolbarButton label="Agregar línea" onClick={() => setEditing({ kind: 'line' })} />
            <InfoNote title="Cómo se calcula" paragraphs={CLIENT_ORDER_HELP} />
          </Box>
          <ListTable
            sortKey="client-order-lines"
            searchFields={(l) => [partLabel(data.partsById.get(l.partId))]}
            searchPlaceholder="Buscar por repuesto…"
            columns={lineColumns}
            rows={order.lines}
            getRowKey={(l) => l.id}
            emptyText="Sin líneas: agrega los repuestos que pidió el cliente."
          />
        </>
      ) : null}

      {!simulating && tab === CLIENT_ORDER_TABS.PURCHASES ? (
        <ListTable
          sortKey="client-order-purchases"
          columns={purchaseColumns}
          rows={purchaseRows}
          getRowKey={(r) => r.key}
          getRowHref={(r) => `/purchase-orders/${r.purchaseOrder.id}`}
          emptyText="Ninguna compra a proveedor cubre este pedido todavía."
        />
      ) : null}

      {!simulating && tab === CLIENT_ORDER_TABS.DATA ? (
        <Card sx={{ p: 2 }}>
          <InfoGrid columns={3}>
            <InfoField label="N.º OC" onEdit={editOrder}>
              {order.number ?? (
                <UncertainValue verified={false} reason="El número de OC del cliente falta">
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
