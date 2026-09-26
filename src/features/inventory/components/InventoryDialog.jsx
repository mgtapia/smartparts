'use client'

import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import FormDialog, {
  DialogAutocomplete,
  DialogField,
  DialogGrid,
  DialogTextInput,
} from '@components/common/FormDialog'
import ModalActionButton from '@components/common/ModalActionButton'
import NumberField from '@components/common/NumberField'
import {
  createInventoryEntry,
  deleteInventoryEntry,
  updateInventoryEntry,
} from '@libs/repos/inventoryRepo'

/**
 * Agrega o edita el stock de un repuesto. Al agregar solo se ofrecen los repuestos que aún no
 * tienen entrada; al editar el repuesto queda fijo. El id lo asigna Firestore.
 *
 * @param {Object} props
 * @param {{ entry: any, part: any }} [props.row]  Entrada a editar; sin ella se agrega una nueva.
 * @param {any[]} props.parts  Todos los repuestos.
 * @param {Set<string>} props.usedPartIds  Repuestos que ya tienen entrada.
 * @param {() => void} props.onSaved
 * @param {() => void} props.onClose
 */
export default function InventoryDialog({ row, parts, usedPartIds, onSaved, onClose }) {
  const editing = Boolean(row)
  const [partId, setPartId] = useState(row?.entry.partId ?? null)
  const [quantity, setQuantity] = useState(row?.entry.quantity ?? null)
  const [location, setLocation] = useState(row?.entry.location ?? '')
  const [notes, setNotes] = useState(row?.entry.notes ?? '')

  const options = useMemo(
    () =>
      parts
        .filter((p) => !usedPartIds.has(p.id))
        .map((p) => ({ value: p.id, label: p.code ? `${p.nameEs} · ${p.code}` : p.nameEs })),
    [parts, usedPartIds],
  )

  const input = { partId, quantity, location, notes }

  return (
    <FormDialog
      title={editing ? 'Editar stock' : 'Agregar stock'}
      canSave={Boolean(partId) && Number.isInteger(quantity)}
      onClose={onClose}
      onSave={async () => {
        if (editing) await updateInventoryEntry(row.entry.id, input)
        else await createInventoryEntry(input)
        onSaved()
      }}
    >
      <DialogField label="Repuesto">
        {editing ? (
          <DialogTextInput
            value={row.part?.nameEs ?? row.entry.partId}
            onChange={() => {}}
            disabled
          />
        ) : (
          <DialogAutocomplete
            options={options}
            value={partId}
            onChange={setPartId}
            placeholder="Buscar repuesto"
            noOptionsText="Sin repuestos disponibles"
          />
        )}
      </DialogField>
      <DialogGrid>
        <NumberField
          label="Cantidad"
          value={quantity}
          onCommit={(n) => setQuantity(n === null ? null : Math.floor(n))}
          adornment="u"
          placeholder="0"
        />
        <DialogField label="Ubicación">
          <DialogTextInput value={location} onChange={setLocation} placeholder="Bodega, estante" />
        </DialogField>
      </DialogGrid>
      <DialogField label="Notas">
        <DialogTextInput value={notes} onChange={setNotes} />
      </DialogField>
      {editing ? (
        <Box sx={{ display: 'flex' }}>
          <ModalActionButton
            label="Quitar del inventario"
            onClick={async () => {
              await deleteInventoryEntry(row.entry.id)
              onSaved()
              onClose()
            }}
          />
        </Box>
      ) : null}
    </FormDialog>
  )
}
