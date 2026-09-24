const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Fecha para la UI con el mes en 3 letras, ej. "24 sep 2026". Sin fecha, un guion. */
export function formatDate(d) {
  if (!d) return '—'
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** 'AAAA-MM-DD' → '24 sep 2026' sin pasar por Date (evita el corrimiento por zona horaria). */
export function formatIsoDate(iso) {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`
}
