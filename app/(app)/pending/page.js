import { Suspense } from 'react'
import PendingPage from '@features/pending/PendingPage'

export default function Page() {
  return (
    <Suspense>
      <PendingPage />
    </Suspense>
  )
}
