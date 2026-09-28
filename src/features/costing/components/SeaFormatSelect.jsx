'use client'

import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { SEA_FORMATS } from '../partCostsModel'
import { SEA_FORMAT_FROM_SETTINGS, useSeaFormat } from '../hooks/useSeaFormat'

const OPTION_LABELS = {
  sea_lcl: 'Carga consolidada (LCL)',
  sea_fcl_20: "Contenedor 20' (FCL)",
  sea_fcl_40hq: "Contenedor 40' HC (FCL)",
}

const OPTIONS = SEA_FORMATS.map((f) => ({
  value: f.value,
  label: OPTION_LABELS[f.value] ?? f.labelEs,
  shortLabel: f.labelEs,
}))

/**
 * Selector del formato marítimo (LCL o contenedor completo) con el que se calcula el costo por
 * barco. Parte en el formato de Ajustes; elegir ese mismo vuelve a seguir a Ajustes.
 */
export default function SeaFormatSelect() {
  const { format, setChoice, settingsFormat } = useSeaFormat()
  return (
    <ToolbarSelectBox
      label="Formato marítimo"
      value={format}
      onChange={(v) => setChoice(v === settingsFormat ? SEA_FORMAT_FROM_SETTINGS : v)}
      options={OPTIONS}
    />
  )
}
