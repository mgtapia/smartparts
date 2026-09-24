'use client'

import { useState } from 'react'
import FormDialog, { DialogField, DialogTextInput } from '@components/common/FormDialog'
import NumberField from '@components/common/NumberField'
import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { CONFIRMED_LOGISTICS_STATUSES } from '@constants/enums'
import { updatePartLogistics } from '@libs/repos/partsRepo'
import { LOGISTICS_STATUS_OPTIONS } from '../constants'

/**
 * Peso bruto y volumen por unidad. Un estado confirmado o medido exige fuente:
 * de eso depende que el flete se calcule sin marcarlo como estimado.
 */
export default function LogisticsDialog({ part, onSaved, onClose }) {
  const [weightKg, setWeightKg] = useState(part.weightG / 1000)
  const [volumeL, setVolumeL] = useState(part.volumeCm3 / 1000)
  const [status, setStatus] = useState(part.logisticsStatus)
  const [source, setSource] = useState(part.logisticsSource ?? '')
  const [note, setNote] = useState(part.logisticsNote ?? '')

  const needsSource = CONFIRMED_LOGISTICS_STATUSES.includes(status)
  const canSave = weightKg > 0 && volumeL > 0 && (!needsSource || source.trim() !== '')

  return (
    <FormDialog
      title="Peso y volumen"
      onClose={onClose}
      canSave={canSave}
      onSave={async () => {
        await updatePartLogistics(part.id, {
          weightG: Math.round(weightKg * 1000),
          volumeCm3: Math.round(volumeL * 1000),
          status,
          source,
          note,
        })
        onSaved()
      }}
    >
      <NumberField
        label="Peso bruto por unidad"
        adornment="kg"
        value={weightKg}
        onCommit={setWeightKg}
      />
      <NumberField label="Volumen por unidad" adornment="L" value={volumeL} onCommit={setVolumeL} />
      <DialogField label="Estado">
        <ToolbarSelectBox
          fullWidth
          label="Estado"
          value={status}
          onChange={setStatus}
          options={LOGISTICS_STATUS_OPTIONS}
        />
      </DialogField>
      <DialogField label="Fuente">
        <DialogTextInput
          value={source}
          onChange={setSource}
          placeholder="Packing list del proveedor, medición propia"
        />
      </DialogField>
      <DialogField label="Nota">
        <DialogTextInput value={note} onChange={setNote} />
      </DialogField>
    </FormDialog>
  )
}
