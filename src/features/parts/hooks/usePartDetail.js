import { useMemo } from 'react'
import { getPart } from '@libs/repos/partsRepo'

export function usePartDetail(partId) {
  const part = useMemo(() => getPart(partId), [partId])
  return { part }
}
