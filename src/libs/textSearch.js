// Búsqueda de texto de las tablas y del buscador global: pura, sin React. Reglas, en orden:
//  - ignora mayúsculas y tildes ("camara" encuentra "Cámara");
//  - cada palabra de la consulta debe aparecer en alguno de los campos (no hace falta el mismo);
//  - una palabra coincide en cualquier parte del texto, o como código sin separadores
//    ("B003427" encuentra "B-003 427");
//  - tolera el plural ("bisagras" encuentra "Bisagra") y las abreviaturas de posición del
//    catálogo ("derecha" encuentra "DER", "trasero" encuentra "TRAS").

/** Minúsculas y sin tildes. */
export const normalizeText = (s) =>
  (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Solo letras y números: compara códigos sin importar guiones ni espacios. */
export const compactText = (s) => normalizeText(s).replace(/[^a-z0-9]/g, '')

/** Palabras equivalentes: el catálogo abrevia la posición (DER, IZQ, DEL, TRAS). */
const SYNONYMS = [
  ['der', 'derecho', 'derecha'],
  ['izq', 'izquierdo', 'izquierda'],
  ['del', 'delantero', 'delantera', 'frontal'],
  ['tras', 'trasero', 'trasera', 'posterior'],
  ['sup', 'superior'],
  ['inf', 'inferior'],
  ['oem', 'original'],
  ['afm', 'alternativo', 'alternativa', 'aftermarket'],
]
const SYNONYMS_OF = new Map(SYNONYMS.flatMap((group) => group.map((w) => [w, group])))

/** Formas con las que puede aparecer una palabra: ella misma, sin plural y sus sinónimos. */
function variantsOf(word) {
  const forms = new Set([word])
  if (word.length > 3 && word.endsWith('es')) forms.add(word.slice(0, -2))
  if (word.length > 3 && word.endsWith('s')) forms.add(word.slice(0, -1))
  for (const form of [...forms]) for (const s of SYNONYMS_OF.get(form) ?? []) forms.add(s)
  return [...forms]
}

/**
 * Prepara una consulta. Devuelve null si está vacía (sin filtro).
 * @param {string} query
 */
export function parseQuery(query) {
  const words = normalizeText(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return null
  return words.map((word) => ({
    variants: variantsOf(word),
    compact: word.replace(/[^a-z0-9]/g, ''),
  }))
}

/** Texto de búsqueda de una fila: sus campos normalizados y su versión compacta para códigos. */
export function haystackOf(fields) {
  const text = fields
    .filter((f) => f != null && f !== '')
    .map(normalizeText)
    .join(' ')
  return { text, compact: text.replace(/[^a-z0-9]/g, '') }
}

/** ¿Cumple la consulta ya preparada? Una consulta vacía (null) cumple siempre. */
export function matchesParsed(parsed, haystack) {
  if (!parsed) return true
  return parsed.every(
    (w) =>
      w.variants.some((v) => haystack.text.includes(v)) ||
      // Códigos con guiones o espacios: solo con 3 o más caracteres, para no coincidir con todo.
      (w.compact.length >= 3 && haystack.compact.includes(w.compact)),
  )
}

/**
 * Atajo para las tablas: `matcher(fields)` dice si una fila con esos campos cumple la búsqueda.
 * @param {string} query
 * @returns {(fields: Array<string|null|undefined>) => boolean}
 */
export function makeMatcher(query) {
  const parsed = parseQuery(query)
  return (fields) => matchesParsed(parsed, haystackOf(fields))
}

/**
 * Qué tan buena es la coincidencia, para ordenar resultados (mayor = mejor): código o nombre
 * exacto, luego que empiece igual, luego que contenga la palabra. Sin coincidencia, 0.
 * @param {string} query
 * @param {Array<string|null|undefined>} fields  El primero es el más importante (el nombre).
 */
export function matchScore(query, fields) {
  const q = normalizeText(query).trim()
  const qCompact = q.replace(/[^a-z0-9]/g, '')
  if (!q) return 0
  let best = 0
  fields.forEach((field, i) => {
    const text = normalizeText(field)
    if (!text) return
    const weight = i === 0 ? 3 : 2
    if (text === q || (qCompact.length >= 3 && text.replace(/[^a-z0-9]/g, '') === qCompact)) {
      best = Math.max(best, 40 * weight)
    } else if (text.startsWith(q)) best = Math.max(best, 20 * weight)
    else if (text.split(/\s+/).some((w) => w.startsWith(q))) best = Math.max(best, 10 * weight)
    else if (text.includes(q)) best = Math.max(best, 5 * weight)
  })
  return best
}
