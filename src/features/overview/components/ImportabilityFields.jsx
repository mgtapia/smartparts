'use client'

import { useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { InfoField } from '@components/common/InfoGrid'
import { listParts } from '@libs/repos/partsRepo'
import { worthImportingCounts } from '@features/costing/partCostsModel'
import { usePartCosts } from '@features/costing/hooks/usePartCosts'
import { useSourcingVehicle } from '@features/vehicles/hooks/useSourcingVehicle'

const HINT =
  'Repuestos cuyo mejor costo puesto en Chile no supera lo que el cliente paga hoy, sobre los que tienen costo y precio de referencia.'

/**
 * Cuántos repuestos del vehículo conviene importar por avión y por barco. Son dos campos de la
 * tarjeta de métricas; mientras se calculan los costos muestran un guion.
 */
export default function ImportabilityFields() {
  const parts = useCachedQuery('parts', listParts)
  const { vehicleId } = useSourcingVehicle()
  const { costs, toClp } = usePartCosts()

  const counts = useMemo(() => {
    if (!costs || !parts.data) return null
    return worthImportingCounts(
      costs,
      parts.data.filter((p) => p.vehicleId === vehicleId),
      toClp,
    )
  }, [costs, parts.data, vehicleId, toClp])

  const show = (c) => (c ? `${c.worth} de ${c.total}` : '—')
  return (
    <>
      <InfoField label="Conviene por avión" hint={HINT}>
        {show(counts?.air)}
      </InfoField>
      <InfoField label="Conviene por barco" hint={HINT}>
        {show(counts?.sea)}
      </InfoField>
    </>
  )
}
