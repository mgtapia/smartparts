import { useEffect, useState } from 'react'

const parseJson = (raw) => JSON.parse(raw)
const stringifyJson = (value) => JSON.stringify(value)

/**
 * `useState` que recuerda su valor en el navegador (localStorage) — para
 * preferencias de vista por persona (filtros, orden, columnas), no para datos
 * de negocio. Restaura después del primer render (no antes) para no romper la
 * hidratación de Next.js, y nunca falla: sin localStorage (modo privado, datos
 * bloqueados) se comporta como un `useState` normal.
 *
 * @template T
 * @param {string} key clave en localStorage (con prefijo `smartparts.`)
 * @param {T} initialValue valor cuando no hay nada guardado
 * @param {{ serialize?: (value: T) => string, deserialize?: (raw: string) => T }} [options]
 * @returns {[T, import('react').Dispatch<import('react').SetStateAction<T>>]}
 */
export function usePersistentState(
  key,
  initialValue,
  { serialize = stringifyJson, deserialize = parseJson } = {},
) {
  const storageKey = `smartparts.${key}`
  const [value, setValue] = useState(initialValue)
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw !== null) setValue(deserialize(raw))
    } catch {
      // Sin acceso a localStorage o valor corrupto: se queda con el inicial.
    }
    setRestored(true)
  }, [storageKey, deserialize])

  useEffect(() => {
    if (!restored) return
    try {
      window.localStorage.setItem(storageKey, serialize(value))
    } catch {
      // Cuota llena o storage bloqueado: la preferencia solo dura la sesión.
    }
  }, [restored, storageKey, serialize, value])

  return [value, setValue]
}
