'use client'

import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { SEA_FORMATS } from '../partCostsModel'
import { SEA_FORMAT_FROM_SETTINGS, useSeaFormat } from '../hooks/useSeaFormat'

const labelOf = (format) => SEA_FORMATS.find((f) => f.value === format)?.labelEs

/** Selector del formato marítimo (LCL o contenedor completo) con el que se calcula el costo por barco. */
export default function SeaFormatSelect() {
  const { choice, setChoice, settingsFormat } = useSeaFormat()
  const options = [
    { value: SEA_FORMAT_FROM_SETTINGS, label: `Ajustes: ${labelOf(settingsFormat)}` },
    ...SEA_FORMATS.map((f) => ({ value: f.value, label: f.labelEs })),
  ]
  return <ToolbarSelectBox label="Marítimo" value={choice} onChange={setChoice} options={options} />
}
