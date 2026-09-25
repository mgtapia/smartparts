import { Suspense } from 'react'
import OrdersPage from '@features/orders/OrdersPage'

export default function Page() {
  return (
    <Suspense>
      <OrdersPage />
    </Suspense>
  )
}
