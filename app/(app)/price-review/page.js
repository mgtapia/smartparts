import { Suspense } from 'react'
import PriceReviewPage from '@features/priceReview/PriceReviewPage'

export default function Page() {
  return (
    <Suspense>
      <PriceReviewPage />
    </Suspense>
  )
}
