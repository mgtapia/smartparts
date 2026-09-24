import { Suspense } from 'react'
import PartDetailPage from '@features/parts/PartDetailPage'

// Sitio estático: una sola página compartida por todas las fichas; el id se lee de la URL.
export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function Page() {
  return (
    <Suspense>
      <PartDetailPage />
    </Suspense>
  )
}
