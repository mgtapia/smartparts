import { useMemo, useState } from 'react'
import { listParts } from '@libs/repos/partsRepo'

export function useQuoteComparator() {
  const partsWithQuotes = useMemo(() => listParts().filter((p) => p.quotes.length > 0), [])
  const [selectedId, setSelectedId] = useState(partsWithQuotes[0]?.id ?? null)

  const selectedPart = useMemo(
    () => partsWithQuotes.find((p) => p.id === selectedId) || null,
    [partsWithQuotes, selectedId],
  )

  return { partsWithQuotes, selectedPart, selectedId, setSelectedId }
}
