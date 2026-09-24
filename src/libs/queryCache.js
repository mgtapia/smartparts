// Caché de lecturas en memoria, compartida por toda la app. Sin ella, cada vez
// que se cambia de pantalla cada hook vuelve a leer Firestore aunque el dato ya
// se hubiera cargado. Un dato leído se reutiliza sin nueva lectura hasta que
// vence (`TTL_MS`) o se invalida por una escritura; en ese caso se muestra el
// dato anterior mientras se vuelve a leer, en vez de vaciar la pantalla.

const TTL_MS = 5 * 60 * 1000

/** @type {Map<string, { data?: any, loaded: boolean, error?: any, at: number, stale: boolean, promise: Promise<any>|null }>} */
const entries = new Map()
/** @type {Map<string, Set<() => void>>} */
const listeners = new Map()

export const peekQuery = (key) => entries.get(key)

export function subscribeQuery(key, listener) {
  if (!listeners.has(key)) listeners.set(key, new Set())
  listeners.get(key).add(listener)
  return () => listeners.get(key)?.delete(listener)
}

const notify = (key) => listeners.get(key)?.forEach((listener) => listener())

/**
 * Lee `key` con `fetcher`, reutilizando el dato si sigue vigente. Varias
 * llamadas simultáneas comparten una sola lectura. `force` ignora la vigencia.
 */
export function loadQuery(key, fetcher, { force = false } = {}) {
  const current = entries.get(key)
  if (current?.promise) return current.promise
  const fresh = current?.loaded && !current.stale && Date.now() - current.at < TTL_MS
  if (fresh && !force) return Promise.resolve(current.data)

  const promise = fetcher()
    .then((data) => {
      entries.set(key, { data, loaded: true, at: Date.now(), stale: false, promise: null })
      notify(key)
      return data
    })
    .catch((error) => {
      entries.set(key, { ...entries.get(key), error, promise: null })
      notify(key)
    })
  entries.set(key, { loaded: false, at: 0, stale: false, ...current, promise })
  return promise
}

/** Marca todo lo cargado como vencido: se vuelve a leer la próxima vez que se use. */
export function invalidateQueries() {
  entries.forEach((entry) => {
    entry.stale = true
  })
}
