'use client'

import { useMemo, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import FormDialog, { DialogTextInput } from '@components/common/FormDialog'
import ListTable from '@components/common/ListTable'
import InfoNote from '@components/common/InfoNote'
import MoneyValue from '@components/common/MoneyValue'
import { createPurchaseOrder } from '@libs/repos/purchaseOrdersRepo'
import { buildPurchaseOrders } from '../purchaseFromOrderModel'
import { ordersTotal } from '../ordersModel'
import { todayIso } from '../constants'

const HELP = [
  'Se crea una OC por proveedor, en borrador, con el Incoterm, el lugar y la moneda de su cotización.',
  'Cada línea lleva la cotización de la oferta elegida y queda enlazada a las líneas de esta OC del cliente por la cantidad asignada.',
  'Si algo falla no se crea nada. Después puedes revisar cada compra y cambiar su estado.',
]

/**
 * Confirma la creación de las OC a proveedores de un escenario de compra: resume proveedores,
 * líneas y montos, y deja editar el número de cada OC. Todas las OC se validan antes de crear
 * la primera.
 *
 * @param {Object} props
 * @param {any} props.scenario
 * @param {import('../purchaseFromOrderModel').BasketEntry[]} props.entries
 * @param {Map<string, any>} props.quotes
 * @param {any} props.order              OC del cliente.
 * @param {any[]} props.purchaseOrders   Las ya creadas.
 * @param {(id: string) => string} props.supplierName
 * @param {() => void | Promise<void>} props.onCreated
 * @param {() => void} props.onClose
 */
export default function CreatePurchaseOrdersDialog({
  scenario,
  entries,
  quotes,
  order,
  purchaseOrders,
  supplierName,
  onCreated,
  onClose,
}) {
  const built = useMemo(
    () => buildPurchaseOrders({ scenario, entries, quotes, order, purchaseOrders }),
    [scenario, entries, quotes, order, purchaseOrders],
  )
  const [numbers, setNumbers] = useState({})
  // Si falla a la mitad, un reintento no repite las OC que ya se crearon.
  const created = useRef(new Set())

  const rows = built.orders.map((po) => ({
    ...po,
    ...ordersTotal(po.lines, po.currency),
    units: po.lines.reduce((s, l) => s + l.qty, 0),
  }))

  const columns = [
    { id: 'supplier', label: 'Proveedor', render: (r) => supplierName(r.supplierId) },
    {
      id: 'number',
      label: 'N.º OC',
      width: 150,
      render: (r) => (
        <DialogTextInput
          value={numbers[r.supplierId] ?? ''}
          onChange={(value) => setNumbers((prev) => ({ ...prev, [r.supplierId]: value }))}
          placeholder="Sin número"
        />
      ),
    },
    { id: 'lines', label: 'Líneas', width: 70, align: 'right', render: (r) => r.lines.length },
    {
      id: 'units',
      label: 'Unidades',
      width: 90,
      align: 'right',
      render: (r) => r.units.toLocaleString('es-CL'),
    },
    {
      id: 'incoterm',
      label: 'Incoterm',
      width: 130,
      render: (r) => [r.incoterm, r.incotermPlace].filter(Boolean).join(' ') || '—',
    },
    {
      id: 'total',
      label: 'Total',
      width: 120,
      align: 'right',
      render: (r) => <MoneyValue money={r.total} />,
    },
  ]

  return (
    <FormDialog
      title="Crear OC de compra"
      saveLabel="Crear OC"
      wide
      canSave={!built.error && rows.length > 0}
      onClose={onClose}
      onSave={async () => {
        for (const po of built.orders) {
          if (created.current.has(po.supplierId)) continue
          await createPurchaseOrder({
            ...po,
            number: numbers[po.supplierId] ?? null,
            date: todayIso(),
          })
          created.current.add(po.supplierId)
        }
        await onCreated()
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="body2">
          {rows.length === 1 ? '1 OC a proveedor' : `${rows.length} OC a proveedores`}
        </Typography>
        <InfoNote dense title="Cómo se crean" paragraphs={HELP} />
      </Box>
      {built.error ? (
        <Typography variant="caption" color="error.main">
          {built.error}
        </Typography>
      ) : (
        <ListTable columns={columns} rows={rows} getRowKey={(r) => r.supplierId} />
      )}
    </FormDialog>
  )
}
