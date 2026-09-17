import { useEffect, useMemo, useState } from 'react'
import { listParts } from '@libs/repos/partsRepo'

export function useQuoteComparator() {
  const [partsWithQuotes, setPartsWithQuotes] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    listParts()
      .then((all) => {
        if (cancelled) return
        const withQuotes = all.filter((p) => p.quotes.length > 0)
        setPartsWithQuotes(withQuotes)
        setSelectedId((prev) => prev ?? withQuotes[0]?.id ?? null)
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
  }, [])

  const selectedPart = useMemo(
    () => partsWithQuotes.find((p) => p.id === selectedId) || null,
    [partsWithQuotes, selectedId],
  )

  return { partsWithQuotes, selectedPart, selectedId, setSelectedId, loading, error }
}
