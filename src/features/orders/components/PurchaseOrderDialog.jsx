'use client'

import { useState } from 'react'
import Typography from '@mui/material/Typography'
import FormDialog, { DialogField, DialogGrid, DialogTextInput } from '@components/common/FormDialog'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { PURCHASE_ORDER_STATUS } from '@constants/enums'
import { formatDate, supplierLabel } from '@features/quotes/constants'
import { createPurchaseOrder, updatePurchaseOrder } from '@libs/repos/purchaseOrdersRepo'
import {
  INCOTERM_OPTIONS,
  PURCHASE_CURRENCY_OPTIONS,
  PURCHASE_STATUS_OPTIONS,
  todayIso,
} from '../constants'

const NONE = 'none'
const quotationOption = (q) => ({
  value: q.id,
  label: `${q.sourceFile ?? 'Sin archivo de origen'} · ${formatDate(q.capturedAt)}`,
})

/**
 * Crea o edita una OC a un proveedor (sin sus líneas). La cotización es
 * opcional: si se elige, propone su Incoterm, lugar y moneda, y sus precios
 * al agregar líneas. Proveedor y moneda no se cambian si la OC ya tiene líneas.
 *
 * @param {Object} props
 * @param {Object} [props.order]
 * @param {Object[]} props.suppliers
 * @param {Object[]} props.quotations  Cotizaciones de todos los proveedores (useQuotationsData).
 * @param {(id: string) => void} props.onSaved
 * @param {() => void} props.onClose
 */
export default function PurchaseOrderDialog({ order, suppliers, quotations, onSaved, onClose }) {
  const editing = Boolean(order)
  const locked = editing && order.lines.length > 0
  const [supplierId, setSupplierId] = useState(order?.supplierId ?? suppliers[0]?.id ?? '')
  const [quotationId, setQuotationId] = useState(order?.quotationId ?? NONE)
  const [number, setNumber] = useState(order?.number ?? '')
  const [date, setDate] = useState(order?.date ?? todayIso())
  const [status, setStatus] = useState(order?.status ?? PURCHASE_ORDER_STATUS.DRAFT)
  const [incoterm, setIncoterm] = useState(order?.incoterm ?? NONE)
  const [incotermPlace, setIncotermPlace] = useState(order?.incotermPlace ?? '')
  const [currency, setCurrency] = useState(order?.currency ?? 'USD')
  const [notes, setNotes] = useState(order?.notes ?? '')

  const supplierQuotations = quotations.filter((q) => q.supplierId === supplierId)

  const pickSupplier = (id) => {
    setSupplierId(id)
    setQuotationId(NONE)
  }
  // La cotización propone sus condiciones; el usuario puede cambiarlas después.
  const pickQuotation = (id) => {
    setQuotationId(id)
    const q = quotations.find((x) => x.id === id)
    if (!q) return
    if (q.incoterms[0]) setIncoterm(q.incoterms[0])
    if (q.incotermPlaces[0]) setIncotermPlace(q.incotermPlaces[0])
    if (!locked && PURCHASE_CURRENCY_OPTIONS.some((o) => o.value === q.currencies[0])) {
      setCurrency(q.currencies[0])
    }
  }

  const input = {
    supplierId,
    quotationId: quotationId === NONE ? null : quotationId,
    number,
    date,
    status,
    incoterm: incoterm === NONE ? null : incoterm,
    incotermPlace,
    currency,
    notes,
  }

  return (
    <FormDialog
      title={editing ? 'Editar OC a proveedor' : 'Nueva OC a proveedor'}
      canSave={Boolean(supplierId)}
      onClose={onClose}
      onSave={async () => {
        if (editing) {
          await updatePurchaseOrder(order.id, input)
          onSaved(order.id)
        } else {
          onSaved(await createPurchaseOrder({ ...input, lines: [] }))
        }
      }}
    >
      <DialogGrid>
        <DialogField label="Proveedor">
          {locked ? (
            <Typography variant="body2" sx={{ height: 44, display: 'flex', alignItems: 'center' }}>
              {supplierLabel(
                suppliers.find((s) => s.id === supplierId),
                supplierId,
              )}
            </Typography>
          ) : (
            <ToolbarSelectBox
              fullWidth
              label="Proveedor"
              value={supplierId}
              onChange={pickSupplier}
              options={suppliers.map((s) => ({ value: s.id, label: supplierLabel(s, s.id) }))}
            />
          )}
        </DialogField>
        <DialogField label="Cotización">
          <ToolbarSelectBox
            fullWidth
            label="Cotización"
            value={quotationId}
            onChange={pickQuotation}
            options={[
              { value: NONE, label: 'Sin cotización' },
              ...supplierQuotations.map(quotationOption),
            ]}
          />
        </DialogField>
        <DialogField label="N.º OC">
          <DialogTextInput value={number} onChange={setNumber} />
        </DialogField>
        <DialogField label="Fecha">
          <DialogTextInput type="date" value={date} onChange={setDate} />
        </DialogField>
        <DialogField label="Estado">
          <ToolbarSelectBox
            fullWidth
            label="Estado"
            value={status}
            onChange={setStatus}
            options={PURCHASE_STATUS_OPTIONS}
          />
        </DialogField>
        <DialogField label="Moneda">
          {locked ? (
            <Typography variant="body2" sx={{ height: 44, display: 'flex', alignItems: 'center' }}>
              {currency}
            </Typography>
          ) : (
            <ToolbarSelectBox
              fullWidth
              label="Moneda"
              value={currency}
              onChange={setCurrency}
              options={PURCHASE_CURRENCY_OPTIONS}
            />
          )}
        </DialogField>
        <DialogField label="Incoterm">
          <ToolbarSelectBox
            fullWidth
            label="Incoterm"
            value={incoterm}
            onChange={setIncoterm}
            options={INCOTERM_OPTIONS}
          />
        </DialogField>
        <DialogField label="Lugar del Incoterm">
          <DialogTextInput
            value={incotermPlace}
            onChange={setIncotermPlace}
            placeholder="Guangzhou"
          />
        </DialogField>
      </DialogGrid>
      <DialogField label="Notas">
        <DialogTextInput value={notes} onChange={setNotes} />
      </DialogField>
    </FormDialog>
  )
}
