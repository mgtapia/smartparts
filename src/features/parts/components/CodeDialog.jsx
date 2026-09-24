'use client'

import { useState } from 'react'
import FormDialog, { DialogField, DialogTextInput } from '@components/common/FormDialog'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { updatePartCode } from '@libs/repos/partsRepo'
import { CODE_STATUS_OPTIONS } from '../constants'

/**
 * Confirma o corrige el código único del repuesto. Confirmar exige fuente
 * citable: sin ella solo se puede dejar provisorio.
 */
export default function CodeDialog({ part, onSaved, onClose }) {
  const [code, setCode] = useState(part.code ?? '')
  const [status, setStatus] = useState(
    part.codeStatus === 'confirmed' ? 'confirmed' : 'provisional',
  )
  const [source, setSource] = useState(part.codeSource ?? '')
  const [note, setNote] = useState(part.sourcingNote ?? '')

  const canSave = code.trim() !== '' && (status !== 'confirmed' || source.trim() !== '')

  return (
    <FormDialog
      title="Código"
      onClose={onClose}
      canSave={canSave}
      onSave={async () => {
        await updatePartCode(part.id, { code, codeStatus: status, source, note })
        onSaved()
      }}
    >
      <DialogField label="Código">
        <DialogTextInput value={code} onChange={setCode} />
      </DialogField>
      <DialogField label="Estado">
        <ToolbarSelectBox
          fullWidth
          label="Estado"
          value={status}
          onChange={setStatus}
          options={CODE_STATUS_OPTIONS}
        />
      </DialogField>
      <DialogField label="Fuente">
        <DialogTextInput
          value={source}
          onChange={setSource}
          placeholder="Proveedor que lo reconoció, catálogo del fabricante"
        />
      </DialogField>
      <DialogField label="Nota">
        <DialogTextInput value={note} onChange={setNote} />
      </DialogField>
    </FormDialog>
  )
}
