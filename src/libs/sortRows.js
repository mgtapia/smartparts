// Orden de filas de las tablas: puro, sin React. Los vacíos van siempre al final, los números se
// comparan como números, el texto sin tildes ni mayúsculas y con los números dentro del texto en
// orden natural ("Bisagra 2" antes de "Bisagra 10").

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true })

const isEmpty = (v) => v == null || v === '' || (typeof v === 'number' && Number.isNaN(v))

/** Compara dos valores ya sin vacíos: número con número, el resto como texto. */
function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return collator.compare(String(a), String(b))
}

/**
 * Filas ordenadas por `getValue(row)`; no modifica la lista original y conserva el orden previo
 * entre iguales. Con `dir` 'desc' se invierte, pero los vacíos siguen al final.
 * @template T
 * @param {T[]} rows
 * @param {(row: T) => string|number|null|undefined} getValue
 * @param {'asc'|'desc'} dir
 * @returns {T[]}
 */
export function sortRows(rows, getValue, dir = 'asc') {
  const sign = dir === 'desc' ? -1 : 1
  return rows
    .map((row, index) => ({ row, index, value: getValue(row) }))
    .sort((x, y) => {
      const xe = isEmpty(x.value)
      const ye = isEmpty(y.value)
      if (xe || ye) return xe === ye ? x.index - y.index : xe ? 1 : -1
      return sign * compareValues(x.value, y.value) || x.index - y.index
    })
    .map((x) => x.row)
}

/**
 * Siguiente estado al hacer clic en el encabezado de una columna: primero ascendente, luego
 * descendente y luego sin orden (vuelve al de la lista).
 * @param {{ id: string, dir: 'asc'|'desc' }|null} current
 * @param {string} id
 */
export function nextSort(current, id) {
  if (!current || current.id !== id) return { id, dir: 'asc' }
  return current.dir === 'asc' ? { id, dir: 'desc' } : null
}
