'use client'

import { useState } from 'react'
import Typography from '@mui/material/Typography'
import FormDialog, { DialogField, DialogGrid, DialogTextInput } from '@components/common/FormDialog'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { CLIENT_ORDER_STATUS } from '@constants/enums'
import { createClientOrder, updateClientOrder } from '@libs/repos/clientOrdersRepo'
import { CLIENT_CURRENCY_OPTIONS, CLIENT_STATUS_OPTIONS, todayIso } from '../constants'

/**
 * Crea o edita una OC del cliente (sin sus líneas). Al crear, `clientId` fija
 * el cliente (desde su ficha) o se elige de la lista. La moneda no se cambia
 * si la OC ya tiene líneas: sus precios están en esa moneda.
 *
 * @param {Object} props
 * @param {Object} [props.order]   OC a editar; sin ella se crea una nueva.
 * @param {Array<{ id: string, name: string }>} props.clients
 * @param {string} [props.clientId]
 * @param {(id: string) => void} props.onSaved
 * @param {() => void} props.onClose
 */
export default function ClientOrderDialog({ order, clients, clientId, onSaved, onClose }) {
  const editing = Boolean(order)
  const [client, setClient] = useState(order?.clientId ?? clientId ?? clients[0]?.id ?? '')
  const [number, setNumber] = useState(order?.number ?? '')
  const [date, setDate] = useState(order?.date ?? todayIso())
  const [status, setStatus] = useState(order?.status ?? CLIENT_ORDER_STATUS.RECEIVED)
  const [currency, setCurrency] = useState(order?.currency ?? 'CLP')
  const [notes, setNotes] = useState(order?.notes ?? '')

  const canPickClient = !editing && !clientId
  const currencyLocked = editing && order.lines.length > 0
  const input = { clientId: client, number, date, status, currency, notes }

  return (
    <FormDialog
      title={editing ? 'Editar OC del cliente' : 'Nueva OC del cliente'}
      canSave={Boolean(client)}
      onClose={onClose}
      onSave={async () => {
        if (editing) {
          await updateClientOrder(order.id, input)
          onSaved(order.id)
        } else {
          onSaved(await createClientOrder(input))
        }
      }}
    >
      {canPickClient ? (
        <DialogField label="Cliente">
          {clients.length > 0 ? (
            <ToolbarSelectBox
              fullWidth
              label="Cliente"
              value={client}
              onChange={setClient}
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
            />
          ) : (
            <Typography variant="body2" color="error.main">
              Primero crea el cliente en Clientes.
            </Typography>
          )}
        </DialogField>
      ) : null}
      <DialogGrid>
        <DialogField label="N.º OC">
          <DialogTextInput value={number} onChange={setNumber} placeholder="Número del cliente" />
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
            options={CLIENT_STATUS_OPTIONS}
          />
        </DialogField>
        <DialogField label="Moneda">
          {currencyLocked ? (
            <Typography variant="body2" sx={{ height: 44, display: 'flex', alignItems: 'center' }}>
              {currency}
            </Typography>
          ) : (
            <ToolbarSelectBox
              fullWidth
              label="Moneda"
              value={currency}
              onChange={setCurrency}
              options={CLIENT_CURRENCY_OPTIONS}
            />
          )}
        </DialogField>
      </DialogGrid>
      <DialogField label="Notas">
        <DialogTextInput value={notes} onChange={setNotes} />
      </DialogField>
    </FormDialog>
  )
}
