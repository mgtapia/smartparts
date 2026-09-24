import { Suspense } from 'react'
import QuotationDetailPage from '@features/quotes/QuotationDetailPage'

// Sitio estático: una sola página compartida por todas las fichas; el id se lee de la URL.
export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function Page() {
  return (
    <Suspense>
      <QuotationDetailPage />
    </Suspense>
  )
}
