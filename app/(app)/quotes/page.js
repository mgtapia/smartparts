import { Suspense } from 'react'
import QuotationsPage from '@features/quotes/QuotationsPage'

export default function Page() {
  return (
    <Suspense>
      <QuotationsPage />
    </Suspense>
  )
}
