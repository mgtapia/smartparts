import { useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { getGlobalSettings } from '@libs/repos/globalSettingsRepo'
import {
  buildFx,
  buildGlobalParams,
  buildRates,
  buildParams,
  pickEditable,
} from '../globalSettingsModel'

/**
 * Ajustes globales vigentes, guardados en la base. Mientras cargan (o si nunca se guardaron) rigen
 * los valores de referencia. `rates` y `params` salen completos, listos para el motor de costos.
 */
export function useGlobalSettings() {
  const { data, loading, error } = useCachedQuery('globalSettings', getGlobalSettings)
  return useMemo(
    () => ({
      loading,
      error,
      saved: data !== null,
      rates: buildRates(data?.rates),
      editableRates: pickEditable(buildRates(data?.rates)),
      globalParams: buildGlobalParams(data?.params),
      params: buildParams(data?.params),
      fx: buildFx(data?.params),
    }),
    [data, loading, error],
  )
}
