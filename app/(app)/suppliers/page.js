import { Suspense } from 'react'
import SuppliersPage from '@features/suppliers/SuppliersPage'

export default function Page() {
  return (
    <Suspense>
      <SuppliersPage />
    </Suspense>
  )
}
