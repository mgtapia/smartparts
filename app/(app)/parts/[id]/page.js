import PartDetailPage from '@features/parts/PartDetailPage'

export default async function Page({ params }) {
  const { id } = await params
  return <PartDetailPage partId={id} />
}
