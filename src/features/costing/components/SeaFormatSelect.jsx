'use client'

import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { SEA_FORMATS } from '../partCostsModel'
import { SEA_FORMAT_FROM_SETTINGS, useSeaFormat } from '../hooks/useSeaFormat'

const OPTION_LABELS = {
  sea_lcl: 'Carga consolidada (LCL)',
  sea_fcl_20: "Contenedor 20' (FCL)",
  sea_fcl_40hq: "Contenedor 40' HC (FCL)",
}
const labelOf = (format) =>
  OPTION_LABELS[format] ?? SEA_FORMATS.find((f) => f.value === format)?.labelEs

const shortOf = (format) => SEA_FORMATS.find((f) => f.value === format)?.labelEs

/** Selector del formato marítimo (LCL o contenedor completo) con el que se calcula el costo por barco. */
export default function SeaFormatSelect() {
  const { choice, setChoice, settingsFormat } = useSeaFormat()
  const options = [
    {
      value: SEA_FORMAT_FROM_SETTINGS,
      label: `Según Ajustes: ${labelOf(settingsFormat)}`,
      shortLabel: `Ajustes: ${shortOf(settingsFormat)}`,
    },
    ...SEA_FORMATS.map((f) => ({ value: f.value, label: labelOf(f.value), shortLabel: f.labelEs })),
  ]
  return (
    <ToolbarSelectBox
      label="Formato marítimo"
      value={choice}
      onChange={setChoice}
      options={options}
    />
  )
}
