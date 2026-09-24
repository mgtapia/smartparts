'use client'

import { useState } from 'react'
import FormDialog, { DialogField, DialogTextInput } from '@components/common/FormDialog'
import { updatePartNames } from '@libs/repos/partsRepo'

/** Nombres en inglés y chino: traducciones para comunicarse con proveedores. */
export default function NamesDialog({ part, onSaved, onClose }) {
  const [nameEn, setNameEn] = useState(part.nameEn ?? '')
  const [nameZh, setNameZh] = useState(part.nameZh ?? '')

  return (
    <FormDialog
      title="Nombres"
      onClose={onClose}
      onSave={async () => {
        await updatePartNames(part.id, { nameEn, nameZh })
        onSaved()
      }}
    >
      <DialogField label="Inglés">
        <DialogTextInput value={nameEn} onChange={setNameEn} />
      </DialogField>
      <DialogField label="Chino">
        <DialogTextInput value={nameZh} onChange={setNameZh} />
      </DialogField>
    </FormDialog>
  )
}
