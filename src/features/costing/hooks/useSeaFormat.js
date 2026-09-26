import { usePersistentState } from '@hooks/usePersistentState'
import { SEA_FORMATS, DEFAULT_SEA_FORMAT } from '../partCostsModel'

/**
 * Formato marítimo con el que se calcula el costo "marítimo" del catálogo y de la ficha: carga
 * consolidada (LCL) o contenedor completo (FCL). Se recuerda por navegador y se comparte entre
 * pantallas.
 * @returns {[string, (format: string) => void]}
 */
export function useSeaFormat() {
  const [format, setFormat] = usePersistentState('costs.seaFormat', DEFAULT_SEA_FORMAT)
  const valid = SEA_FORMATS.some((f) => f.value === format) ? format : DEFAULT_SEA_FORMAT
  return [valid, setFormat]
}
