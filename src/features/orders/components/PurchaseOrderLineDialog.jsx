'use client'

import { useMemo, useState } from 'react'
import Typography from '@mui/material/Typography'
import FormDialog, {
  DialogAutocomplete,
  DialogField,
  DialogGrid,
} from '@components/common/FormDialog'
import NumberField from '@components/common/NumberField'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { parseMoneyInput, toInputNumber } from '@libs/money'
import { addPurchaseOrderLine, updatePurchaseOrderLine } from '@libs/repos/purchaseOrdersRepo'
import { quotePriceForQty, remainingByClientLine, validateLinks } from '../ordersModel'
import { CURRENCY_ADORNMENT, orderLabel, partOptions } from '../constants'

const MANUAL = 'manual'
const QUALITY = { original: 'OEM', alternative: 'AFM' }

/**
 * Línea de una OC a proveedor: repuesto, cantidad, precio unitario del
 * proveedor y a qué líneas de OC de clientes del mismo repuesto cubre. Si la
 * OC tiene cotización, el precio puede salir de una de sus líneas (con el
 * tramo por volumen que alcanza la cantidad). Nunca se enlaza más de lo que
 * falta cubrir de cada pedido ni más de lo que se compra.
 *
 * @param {Object} props
 * @param {Object} props.order          OC a proveedor.
 * @param {Object} [props.line]         Línea a editar; sin ella se agrega una.
 * @param {Object[]} props.parts
 * @param {Object|null} props.quotation Cotización de la OC (useQuotationsData), si tiene.
 * @param {Object[]} props.clientOrders OC de clientes vigentes, con sus líneas.
 * @param {Object[]} props.purchaseOrders Todas las OC a proveedores (para lo ya cubierto).
 * @param {Map<string, Object>} props.clientsById
 * @param {() => void} props.onSaved
 * @param {() => void} props.onClose
 */
export default function PurchaseOrderLineDialog({
  order,
  line,
  parts,
  quotation,
  clientOrders,
  purchaseOrders,
  clientsById,
  onSaved,
  onClose,
}) {
  const [partId, setPartId] = useState(line?.partId ?? null)
  const [qty, setQty] = useState(line?.qty ?? 1)
  const [price, setPrice] = useState(toInputNumber(line?.unitPrice ?? null))
  const [quoteLineId, setQuoteLineId] = useState(line?.quoteLineId ?? MANUAL)
  // id de línea del cliente → unidades de esta compra asignadas.
  const [links, setLinks] = useState(
    () => new Map((line?.clientOrderLinks ?? []).map((l) => [l.lineId, l.qty])),
  )
  const options = useMemo(() => partOptions(parts), [parts])

  // Líneas de pedidos de clientes del mismo repuesto, con lo que falta cubrir
  // sin contar esta línea de compra (sus enlaces se pueden reasignar).
  const candidates = useMemo(() => {
    if (!partId) return []
    return clientOrders.flatMap((co) => {
      const remaining = remainingByClientLine(co, purchaseOrders, line?.id ?? null)
      return co.lines
        .filter((l) => l.partId === partId)
        .map((l) => ({ clientOrder: co, line: l, remaining: remaining.get(l.id) ?? 0 }))
        .filter((c) => c.remaining > 0 || links.has(c.line.id))
    })
  }, [partId, clientOrders, purchaseOrders, line, links])

  // Líneas de la cotización de este repuesto en la moneda de la OC.
  const quoteLines = useMemo(
    () =>
      (quotation?.lines ?? [])
        .map((l) => l.quote)
        .filter((q) => q.partId === partId && q.currency === order.currency),
    [quotation, partId, order.currency],
  )

  const applyQuote = (id, forQty) => {
    setQuoteLineId(id)
    const quote = quoteLines.find((q) => q.id === id)
    const unit = quote ? quotePriceForQty(quote, forQty) : null
    if (unit) setPrice(toInputNumber(unit))
  }

  const pickPart = (id) => {
    setPartId(id)
    setQuoteLineId(MANUAL)
    // Línea nueva: propone cubrir todo lo que falta de los pedidos de ese repuesto.
    if (line || !id) {
      setLinks(new Map())
      return
    }
    const next = new Map()
    for (const co of clientOrders) {
      const remaining = remainingByClientLine(co, purchaseOrders, null)
      for (const l of co.lines) {
        if (l.partId === id && (remaining.get(l.id) ?? 0) > 0) next.set(l.id, remaining.get(l.id))
      }
    }
    setLinks(next)
    const total = [...next.values()].reduce((s, n) => s + n, 0)
    if (total > 0) setQty(total)
  }

  const changeQty = (n) => {
    setQty(n)
    // El tramo por volumen depende de la cantidad.
    if (quoteLineId !== MANUAL && Number.isInteger(n)) applyQuote(quoteLineId, n)
  }

  const setLinkQty = (lineId, n) => {
    const next = new Map(links)
    if (!n) next.delete(lineId)
    else next.set(lineId, n)
    setLinks(next)
  }

  const linkList = candidates
    .filter((c) => links.get(c.line.id))
    .map((c) => ({ clientOrderId: c.clientOrder.id, lineId: c.line.id, qty: links.get(c.line.id) }))
  const remainingMap = new Map(candidates.map((c) => [c.line.id, c.remaining]))
  const validQty = Number.isInteger(qty) && qty > 0
  const linkError = validQty ? validateLinks(qty, linkList, remainingMap) : null

  const input = {
    partId,
    qty,
    unitPrice: parseMoneyInput(price, order.currency),
    quoteLineId: quoteLineId === MANUAL ? null : quoteLineId,
    clientOrderLinks: linkList,
  }

  return (
    <FormDialog
      wide
      title={line ? 'Editar línea de compra' : 'Agregar línea de compra'}
      canSave={Boolean(partId) && validQty && !linkError}
      onClose={onClose}
      onSave={async () => {
        if (line) await updatePurchaseOrderLine(order.id, line.id, input)
        else await addPurchaseOrderLine(order.id, input)
        onSaved()
      }}
    >
      <DialogField label="Repuesto">
        <DialogAutocomplete
          options={options}
          value={partId}
          onChange={pickPart}
          placeholder="Buscar por código o nombre"
        />
      </DialogField>
      {quoteLines.length > 0 ? (
        <DialogField label="Precio de la cotización">
          <ToolbarSelectBox
            fullWidth
            label="Precio de la cotización"
            value={quoteLineId}
            onChange={(id) => (id === MANUAL ? setQuoteLineId(MANUAL) : applyQuote(id, qty))}
            options={[
              { value: MANUAL, label: 'Precio manual' },
              ...quoteLines.map((q) => ({
                value: q.id,
                label: [QUALITY[q.partType] ?? q.partType, q.variant].filter(Boolean).join(' · '),
              })),
            ]}
          />
        </DialogField>
      ) : null}
      <DialogGrid>
        <NumberField label="Cantidad" adornment="u" value={qty} onCommit={changeQty} />
        <NumberField
          label="Precio unitario"
          adornment={CURRENCY_ADORNMENT[order.currency]}
          value={price}
          onCommit={(n) => {
            setPrice(n)
            setQuoteLineId(MANUAL)
          }}
        />
      </DialogGrid>

      {partId ? (
        <DialogField label="Pedidos que cubre">
          {candidates.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Ningún pedido de cliente abierto tiene este repuesto por cubrir.
            </Typography>
          ) : (
            <DialogGrid>
              {candidates.map((c) => (
                <NumberField
                  key={c.line.id}
                  label={`${orderLabel(c.clientOrder)} · ${clientsById.get(c.clientOrder.clientId)?.name ?? 'Cliente'} · falta ${c.remaining}`}
                  adornment="u"
                  placeholder="0"
                  value={links.get(c.line.id) ?? null}
                  onCommit={(n) => setLinkQty(c.line.id, n)}
                />
              ))}
            </DialogGrid>
          )}
        </DialogField>
      ) : null}
      {linkError ? (
        <Typography variant="caption" color="error.main">
          {linkError}
        </Typography>
      ) : null}
    </FormDialog>
  )
}
