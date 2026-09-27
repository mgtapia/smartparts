'use client'

import { useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { InfoField } from '@components/common/InfoGrid'
import { listParts } from '@libs/repos/partsRepo'
import { worthImportingCounts } from '@features/costing/partCostsModel'
import { usePartCosts } from '@features/costing/hooks/usePartCosts'
import { useSourcingVehicle } from '@features/vehicles/hooks/useSourcingVehicle'

const HINT =
  'Repuestos que se ofrecen (mismo criterio que el Catálogo): el cliente ahorra al menos lo mínimo con el margen mínimo, sobre los que tienen costo y Precio REF.'

/**
 * Cuántos repuestos del vehículo se ofrecen por avión y por barco. Son dos campos de la tarjeta de
 * métricas; mientras se calculan los costos muestran un guion.
 */
export default function ImportabilityFields() {
  const parts = useCachedQuery('parts', listParts)
  const { vehicleId } = useSourcingVehicle()
  const { costs, toClp, rates } = usePartCosts()

  const counts = useMemo(() => {
    if (!costs || !parts.data) return null
    return worthImportingCounts(
      costs,
      parts.data.filter((p) => p.vehicleId === vehicleId),
      toClp,
      rates,
    )
  }, [costs, parts.data, vehicleId, toClp, rates])

  const show = (c) => (c ? `${c.worth} de ${c.total}` : '—')
  return (
    <>
      <InfoField label="Se ofrece por avión" hint={HINT}>
        {show(counts?.air)}
      </InfoField>
      <InfoField label="Se ofrece por barco" hint={HINT}>
        {show(counts?.sea)}
      </InfoField>
    </>
  )
}
