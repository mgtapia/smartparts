'use client'

import { useMemo, useState } from 'react'
import FormDialog, {
  DialogAutocomplete,
  DialogField,
  DialogGrid,
} from '@components/common/FormDialog'
import NumberField from '@components/common/NumberField'
import { parseMoneyInput, toInputNumber } from '@libs/money'
import { FULFILLMENT } from '@constants/enums'
import { addClientOrderLine, updateClientOrderLine } from '@libs/repos/clientOrdersRepo'
import { CURRENCY_ADORNMENT, partOptions } from '../constants'

/**
 * Línea de la OC del cliente: repuesto, cantidad y precio de venta unitario
 * acordado, en la moneda de la OC. Es lo mínimo que necesita el simulador de
 * compra (repuesto y cantidad). Toda línea se cumple comprando por ahora.
 *
 * @param {Object} props
 * @param {{ id: string, currency: string }} props.order
 * @param {Object} [props.line]  Línea a editar; sin ella se agrega una nueva.
 * @param {Object[]} props.parts
 * @param {boolean} [props.partLocked]  El repuesto no se cambia si una compra ya enlaza la línea.
 * @param {number} [props.minQty]  Lo ya cubierto por compras: la cantidad no puede bajar de eso.
 * @param {() => void} props.onSaved
 * @param {() => void} props.onClose
 */
export default function ClientOrderLineDialog({
  order,
  line,
  parts,
  partLocked = false,
  minQty = 1,
  onSaved,
  onClose,
}) {
  const [partId, setPartId] = useState(line?.partId ?? null)
  const [qty, setQty] = useState(line?.qty ?? 1)
  const [price, setPrice] = useState(toInputNumber(line?.unitPrice ?? null))
  const options = useMemo(() => partOptions(parts), [parts])

  const validQty = Number.isInteger(qty) && qty >= Math.max(minQty, 1)
  const input = {
    partId,
    qty,
    unitPrice: parseMoneyInput(price, order.currency),
    fulfillment: line?.fulfillment ?? FULFILLMENT.PURCHASE,
  }

  return (
    <FormDialog
      title={line ? 'Editar línea' : 'Agregar línea'}
      canSave={Boolean(partId) && validQty}
      onClose={onClose}
      onSave={async () => {
        if (line) await updateClientOrderLine(order.id, line.id, input)
        else await addClientOrderLine(order.id, input)
        onSaved()
      }}
    >
      <DialogField label="Repuesto">
        {partLocked ? (
          options.find((o) => o.value === partId)?.label
        ) : (
          <DialogAutocomplete
            options={options}
            value={partId}
            onChange={setPartId}
            placeholder="Buscar por código o nombre"
          />
        )}
      </DialogField>
      <DialogGrid>
        <NumberField
          label={minQty > 1 ? `Cantidad, mínimo ${minQty} ya comprado` : 'Cantidad'}
          adornment="u"
          value={qty}
          onCommit={setQty}
        />
        <NumberField
          label="Precio unitario de venta"
          adornment={CURRENCY_ADORNMENT[order.currency]}
          value={price}
          onCommit={setPrice}
        />
      </DialogGrid>
    </FormDialog>
  )
}
