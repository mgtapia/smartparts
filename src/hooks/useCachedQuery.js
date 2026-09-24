'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'
import { loadQuery, peekQuery, subscribeQuery } from '@libs/queryCache'

/**
 * Lectura de datos con caché compartida (ver `@libs/queryCache`): si el dato
 * ya se cargó, aparece al instante y `loading` es falso; solo se lee de nuevo
 * cuando venció o se invalidó, y mientras tanto se sigue mostrando el anterior.
 *
 * @template T
 * @param {string} key  Identifica el dato; la misma clave comparte la caché.
 * @param {() => Promise<T>} fetcher
 * @returns {{ data: T|null, loading: boolean, error: any, reload: () => Promise<any> }}
 */
export function useCachedQuery(key, fetcher) {
  const [, rerender] = useReducer((n) => n + 1, 0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    const unsubscribe = subscribeQuery(key, rerender)
    loadQuery(key, () => fetcherRef.current())
    return unsubscribe
  }, [key])

  const reload = useCallback(
    () => loadQuery(key, () => fetcherRef.current(), { force: true }),
    [key],
  )

  const entry = peekQuery(key)
  return {
    data: entry?.loaded ? entry.data : null,
    loading: !entry?.loaded && !entry?.error,
    error: entry?.error ?? null,
    reload,
  }
}
