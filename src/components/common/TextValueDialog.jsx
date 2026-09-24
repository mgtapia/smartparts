'use client'

import { useState } from 'react'
import FormDialog, { DialogField, DialogTextInput } from '@components/common/FormDialog'

/**
 * Edita un dato de texto simple, sin confirmación ni fuente (alias, contacto,
 * nombres). Para un dato que se confirma usar `SourcedValueDialog`.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} props.label
 * @param {string} [props.initial]
 * @param {(value: string) => Promise<void>} props.onSave
 * @param {() => void} props.onClose
 */
export default function TextValueDialog({ title, label, initial = '', onSave, onClose }) {
  const [value, setValue] = useState(initial)

  return (
    <FormDialog title={title} onClose={onClose} onSave={() => onSave(value)}>
      <DialogField label={label}>
        <DialogTextInput value={value} onChange={setValue} />
      </DialogField>
    </FormDialog>
  )
}
