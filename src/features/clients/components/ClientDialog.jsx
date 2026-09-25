'use client'

import { useState } from 'react'
import FormDialog, { DialogField, DialogGrid, DialogTextInput } from '@components/common/FormDialog'
import { createClient, updateClient } from '@libs/repos/clientsRepo'

/**
 * Crea o edita un cliente. El nombre es obligatorio; el resto se completa
 * cuando se tenga. El id lo asigna Firestore.
 *
 * @param {Object} props
 * @param {Object} [props.client]  Cliente a editar; sin él se crea uno nuevo.
 * @param {(id: string) => void} props.onSaved
 * @param {() => void} props.onClose
 */
export default function ClientDialog({ client, onSaved, onClose }) {
  const [name, setName] = useState(client?.name ?? '')
  const [rut, setRut] = useState(client?.rut ?? '')
  const [person, setPerson] = useState(client?.contact.person ?? '')
  const [email, setEmail] = useState(client?.contact.email ?? '')
  const [phone, setPhone] = useState(client?.contact.phone ?? '')
  const [notes, setNotes] = useState(client?.notes ?? '')

  const input = { name, rut, contact: { person, email, phone }, notes }

  return (
    <FormDialog
      title={client ? 'Editar cliente' : 'Nuevo cliente'}
      canSave={name.trim() !== ''}
      onClose={onClose}
      onSave={async () => {
        if (client) {
          await updateClient(client.id, input)
          onSaved(client.id)
        } else {
          onSaved(await createClient(input))
        }
      }}
    >
      <DialogGrid>
        <DialogField label="Razón social">
          <DialogTextInput value={name} onChange={setName} />
        </DialogField>
        <DialogField label="RUT">
          <DialogTextInput value={rut} onChange={setRut} placeholder="76.123.456-7" />
        </DialogField>
        <DialogField label="Contacto">
          <DialogTextInput value={person} onChange={setPerson} />
        </DialogField>
        <DialogField label="Teléfono">
          <DialogTextInput value={phone} onChange={setPhone} />
        </DialogField>
      </DialogGrid>
      <DialogField label="Correo">
        <DialogTextInput value={email} onChange={setEmail} />
      </DialogField>
      <DialogField label="Notas">
        <DialogTextInput value={notes} onChange={setNotes} />
      </DialogField>
    </FormDialog>
  )
}
