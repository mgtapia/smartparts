import { usePersistentState } from '@hooks/usePersistentState'
import { useGlobalSettings } from '@features/settings/hooks/useGlobalSettings'
import { SEA_FORMATS, DEFAULT_SEA_FORMAT } from '../partCostsModel'

/** Elección "según Ajustes": no hay formato propio de esta pantalla. */
export const SEA_FORMAT_FROM_SETTINGS = ''

/**
 * Formato marítimo con el que se calcula el costo "marítimo" del catálogo y de la ficha: carga
 * consolidada (LCL) o contenedor completo (FCL). Por defecto rige el de Ajustes; quien lo cambia en
 * una pantalla lo recuerda en su navegador, y la elección se comparte entre pantallas.
 * @returns {{ format: string, choice: string, setChoice: (choice: string) => void, settingsFormat: string }}
 */
export function useSeaFormat() {
  const { rates } = useGlobalSettings()
  const [choice, setChoice] = usePersistentState('costs.seaFormat.v2', SEA_FORMAT_FROM_SETTINGS)
  const known = (f) => SEA_FORMATS.some((x) => x.value === f)
  const settingsFormat = known(rates.pvpSeaFormat) ? rates.pvpSeaFormat : DEFAULT_SEA_FORMAT
  return {
    format: known(choice) ? choice : settingsFormat,
    choice: known(choice) ? choice : SEA_FORMAT_FROM_SETTINGS,
    setChoice,
    settingsFormat,
  }
}
