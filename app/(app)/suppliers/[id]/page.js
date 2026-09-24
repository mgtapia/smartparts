import { Suspense } from 'react'
import SupplierDetailPage from '@features/suppliers/SupplierDetailPage'

export default async function Page({ params }) {
  const { id } = await params
  return (
    <Suspense>
      <SupplierDetailPage supplierId={id} />
    </Suspense>
  )
}
