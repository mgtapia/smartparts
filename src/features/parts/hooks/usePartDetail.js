import { useCallback, useEffect, useState } from 'react'
import { getPart } from '@libs/repos/partsRepo'

export function usePartDetail(partId) {
  const [part, setPart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getPart(partId)
      .then((p) => {
        if (cancelled) return
        setPart(p)
        setLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [partId])

  useEffect(() => refetch(), [refetch])

  return { part, loading, error, refetch }
}
