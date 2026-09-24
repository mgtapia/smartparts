const FORMAT = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })

/** Basis points → texto para la UI: 4120 → "41,2 %". Solo presentación. */
export function formatBp(bp) {
  return `${FORMAT.format(bp / 100)} %`
}
