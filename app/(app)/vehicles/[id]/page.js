import { Suspense } from 'react'
import VehicleDetailPage from '@features/vehicles/VehicleDetailPage'

// Sitio estático: una sola página compartida por todas las fichas; el id se lee de la URL.
export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function Page() {
  return (
    <Suspense>
      <VehicleDetailPage />
    </Suspense>
  )
}
