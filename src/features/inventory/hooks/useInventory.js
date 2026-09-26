import { useMemo } from 'react'
import { useCachedQuery } from '@hooks/useCachedQuery'
import { listInventory } from '@libs/repos/inventoryRepo'
import { listParts } from '@libs/repos/partsRepo'

/**
 * Stock cargado por el usuario, cada entrada con su repuesto, ordenado por nombre. `parts` son
 * todos los repuestos (para elegir cuál agregar). `reload` vuelve a leer después de guardar.
 */
export function useInventory() {
  const inventory = useCachedQuery('inventory', listInventory)
  const parts = useCachedQuery('parts', listParts)

  const rows = useMemo(() => {
    const partById = new Map((parts.data ?? []).map((p) => [p.id, p]))
    return (inventory.data ?? [])
      .map((entry) => ({ entry, part: partById.get(entry.partId) ?? null }))
      .sort((a, b) => (a.part?.nameEs ?? '').localeCompare(b.part?.nameEs ?? '', 'es'))
  }, [inventory.data, parts.data])

  return {
    rows,
    parts: parts.data ?? [],
    loading: inventory.loading || parts.loading,
    error: inventory.error || parts.error,
    reload: inventory.reload,
  }
}
