'use client'

import ToolbarSelectBox from '@components/common/ToolbarSelectBox'
import { SEA_FORMATS } from '../partCostsModel'
import { useSeaFormat } from '../hooks/useSeaFormat'

const OPTIONS = SEA_FORMATS.map((f) => ({ value: f.value, label: f.labelEs }))

/** Selector del formato marítimo (LCL o contenedor completo) con el que se calcula el costo por barco. */
export default function SeaFormatSelect() {
  const [format, setFormat] = useSeaFormat()
  return <ToolbarSelectBox label="Marítimo" value={format} onChange={setFormat} options={OPTIONS} />
}
