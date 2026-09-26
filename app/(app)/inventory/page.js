import { Suspense } from 'react'
import InventoryPage from '@features/inventory/InventoryPage'

export default function Page() {
  return (
    <Suspense>
      <InventoryPage />
    </Suspense>
  )
}
