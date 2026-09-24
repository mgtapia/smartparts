import { Suspense } from 'react'
import OverviewPage from '@features/overview/OverviewPage'

export default function Page() {
  return (
    <Suspense>
      <OverviewPage />
    </Suspense>
  )
}
