import { Suspense } from 'react'
import VehicleDetailPage from '@features/vehicles/VehicleDetailPage'

export default async function Page({ params }) {
  const { id } = await params
  return (
    <Suspense>
      <VehicleDetailPage vehicleId={id} />
    </Suspense>
  )
}
