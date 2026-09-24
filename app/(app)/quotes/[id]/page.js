import QuotationDetailPage from '@features/quotes/QuotationDetailPage'

export default async function Page({ params }) {
  const { id } = await params
  return <QuotationDetailPage quotationId={id} />
}
