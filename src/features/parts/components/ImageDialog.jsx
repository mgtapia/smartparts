'use client'

import { useRef, useState } from 'react'
import Box from '@mui/material/Box'
import FormDialog, { DialogField, DialogTextInput } from '@components/common/FormDialog'
import ModalActionButton from '@components/common/ModalActionButton'
import { IMAGE_PREVIEW_HEIGHT } from '@constants/layout'
import { resizeImageToDataUrl } from '@libs/imageResize'
import { savePartImage } from '@libs/repos/partsRepo'

/** Carga la foto del repuesto: se reduce en el navegador antes de guardarla. */
export default function ImageDialog({ part, image, onSaved, onClose }) {
  const inputRef = useRef(null)
  const [dataUrl, setDataUrl] = useState(null)
  const [source, setSource] = useState(image?.source ?? '')
  const [readError, setReadError] = useState(false)

  const pick = async (file) => {
    if (!file) return
    setReadError(false)
    try {
      setDataUrl(await resizeImageToDataUrl(file))
    } catch {
      setReadError(true)
    }
  }
  const preview = dataUrl ?? image?.dataUrl ?? null

  return (
    <FormDialog
      title="Imagen"
      onClose={onClose}
      canSave={Boolean(dataUrl)}
      onSave={async () => {
        await savePartImage(part.id, { dataUrl, source })
        onSaved()
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {preview ? (
        <Box
          component="img"
          src={preview}
          alt={part.nameEs}
          sx={{ width: '100%', maxHeight: IMAGE_PREVIEW_HEIGHT, objectFit: 'contain' }}
        />
      ) : null}
      <Box>
        <ModalActionButton
          label={preview ? 'Cambiar imagen' : 'Elegir imagen'}
          onClick={() => inputRef.current?.click()}
        />
      </Box>
      {readError ? (
        <Box sx={{ color: 'error.main', fontSize: 12 }}>No se pudo leer la imagen.</Box>
      ) : null}
      <DialogField label="Fuente">
        <DialogTextInput
          value={source}
          onChange={setSource}
          placeholder="Foto del proveedor, foto propia"
        />
      </DialogField>
    </FormDialog>
  )
}
