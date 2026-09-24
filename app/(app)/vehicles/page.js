import { Suspense } from 'react'
import VehiclesPage from '@features/vehicles/VehiclesPage'

export default function Page() {
  return (
    <Suspense>
      <VehiclesPage />
    </Suspense>
  )
}
