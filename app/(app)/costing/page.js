import CostingCalculatorPage from '@features/costing/CostingCalculatorPage'

export default async function Page({ searchParams }) {
  const { partId } = await searchParams
  return <CostingCalculatorPage initialPartId={partId} />
}
