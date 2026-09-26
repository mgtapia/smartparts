import { Suspense } from 'react'
import AirTrialPage from '@features/trial/AirTrialPage'

export default function Page() {
  return (
    <Suspense>
      <AirTrialPage />
    </Suspense>
  )
}
