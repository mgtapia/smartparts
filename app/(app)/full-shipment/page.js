import { Suspense } from 'react'
import FullShipmentPage from '@features/fullShipment/FullShipmentPage'

export default function Page() {
  return (
    <Suspense>
      <FullShipmentPage />
    </Suspense>
  )
}
