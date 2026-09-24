import { useCachedQuery } from '@hooks/useCachedQuery'
import { listVehicles } from '@libs/repos/vehiclesRepo'

/**
 * Vehículo de la etapa de sourcing (`sourcing_stage: true`): el alcance de
 * Pendientes y Vista general. Comparte la caché de vehículos con el resto.
 */
export function useSourcingVehicle() {
  const { data, loading, error } = useCachedQuery('vehicles', listVehicles)
  const vehicle = data?.find((v) => v.sourcingStage) ?? null
  return { vehicleId: vehicle?.id ?? null, loading, error }
}
