'use client'

import { useState } from 'react'
import FormDialog, { DialogField, DialogTextInput } from '@components/common/FormDialog'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'

/**
 * Confirma o corrige un dato con su fuente (chat, proforma, correo, documento).
 * Sin fuente no se confirma: al confirmar el dato deja de mostrarse en rojo.
 * `options` vacío = texto libre.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} props.label        Nombre del dato.
 * @param {string} [props.initial]
 * @param {string} [props.initialSource]
 * @param {Array<{value: string, label: string}>} [props.options]
 * @param {string} [props.placeholder]
 * @param {(value: string, source: string) => Promise<void>} props.onSave
 * @param {() => void} props.onClose
 */
export default function SourcedValueDialog({
  title,
  label,
  initial = '',
  initialSource = '',
  options,
  placeholder,
  onSave,
  onClose,
}) {
  const [value, setValue] = useState(initial)
  const [source, setSource] = useState(initialSource)

  return (
    <FormDialog
      title={title}
      onClose={onClose}
      onSave={() => onSave(value.trim(), source.trim())}
      canSave={value.trim() !== '' && source.trim() !== ''}
      saveLabel="Confirmar"
    >
      <DialogField label={label}>
        {options ? (
          <ToolbarSelectBox
            fullWidth
            label={label}
            value={value}
            onChange={setValue}
            options={options}
          />
        ) : (
          <DialogTextInput value={value} onChange={setValue} placeholder={placeholder} />
        )}
      </DialogField>
      <DialogField label="Fuente">
        <DialogTextInput
          value={source}
          onChange={setSource}
          placeholder="Chat 24-09, proforma, correo"
        />
      </DialogField>
    </FormDialog>
  )
}
