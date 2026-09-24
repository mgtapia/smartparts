import { getPart } from '@libs/repos/partsRepo'
import { useCachedQuery } from '@hooks/useCachedQuery'

export function usePartDetail(partId) {
  const { data, loading, error, reload } = useCachedQuery(`part:${partId}`, () => getPart(partId))
  return { part: data, loading, error, refetch: reload }
}
