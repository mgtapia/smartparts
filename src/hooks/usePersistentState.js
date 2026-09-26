import { useEffect, useRef, useState } from 'react'

const SYNC_EVENT = 'smartparts:persistent-state'

/** Opciones para persistir un `Set` (se guarda como lista). */
export const SET_STORAGE = {
  serialize: (set) => JSON.stringify([...set]),
  deserialize: (raw) => new Set(JSON.parse(raw)),
}

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
  const valueRef = useRef(value)
  valueRef.current = value

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
      const raw = serialize(value)
      if (window.localStorage.getItem(storageKey) === raw) return
      window.localStorage.setItem(storageKey, raw)
      // Avisa a las otras copias de este mismo valor en la página (otro componente, la barra
      // superior…) para que no queden con el valor viejo.
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { storageKey, raw } }))
    } catch {
      // Cuota llena o storage bloqueado: la preferencia solo dura la sesión.
    }
  }, [restored, storageKey, serialize, value])

  useEffect(() => {
    const onSync = (event) => {
      if (event.detail?.storageKey !== storageKey) return
      try {
        if (serialize(valueRef.current) !== event.detail.raw)
          setValue(deserialize(event.detail.raw))
      } catch {
        // Valor corrupto: se ignora.
      }
    }
    window.addEventListener(SYNC_EVENT, onSync)
    return () => window.removeEventListener(SYNC_EVENT, onSync)
  }, [storageKey, serialize, deserialize])

  return [value, setValue]
}
