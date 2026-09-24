import { Suspense } from 'react'
import CostingCalculatorPage from '@features/costing/CostingCalculatorPage'

export default function Page() {
  return (
    <Suspense>
      <CostingCalculatorPage />
    </Suspense>
  )
}
